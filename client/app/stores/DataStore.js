import AppDispatcher from "../dispatcher/AppDispatcher";
import { EventEmitter } from "events";
import assign from "object-assign";
import rbush from "rbush";
import Constants from "../constants/Constants";
import * as d3 from "d3";

const CHANGE_EVENT = "change";

// Current user
let userInfo = null;

// List of available experiments
let experimentList = {
  updating: false,
  experiments: []
}

// Active experiment
let experiment = null;

// User edit history
let history = {
  index: -1,
  edits: []
};

// Data loading
let loading = null;

// Playback
let playback = {
  play: false,
  loop: "none",
  frame: 0,
  frameRate: 4,
  direction: 1
};
let timer = null;

// Settings
let settings = {
  zoom: 1,
  filmstripZoom: 1,
  zoomDefault: null,
  filmstripZoomDefault: null,
  zoomPoint: [0.5, 0.5],
  editMode: "regionSelect",
  stabilize: true,
  framesToLoad: 10,
  frameOverlap: 2,
  showTrajectories: true,
  currentLabel: ""
};

// Linking 
let linking = {
  frame: -1,
  region: null
}

function setUserInfo(info) {
  userInfo = info;
}

function setExperimentList(newList) {
  experimentList.updating = false;
  experimentList.experiments = newList;

  // XXX: Decorate with user-specific info here, until such info is supplied by the server
  experimentList.experiments.forEach(experiment => {
    // XXX: Use a fraction since we don't know the number of frames yet
    experiment.userProgress = Math.random();
  });
}

function selectExperiment(newExperiment) {
  experiment = newExperiment;
  experimentList.updating = true;

  reset();
}

function reset() {
  resetHistory();
  resetLoading();
}

function setExperiment(newExperiment) {
  if (newExperiment && newExperiment !== experiment) {
    experiment = newExperiment;

    experiment.name = experimentList.experiments.filter(e => {
      return e.id === experiment.id;
    })[0].name;
    experiment.images = [];

    // Number of frames
    const n = Math.min(experiment.frames, settings.framesToLoad);

    // Center around start_frame
    let start = Math.max(experiment.start_frame - Math.ceil(n / 2) + 1, 1);
    const stop = Math.min(start + n - 1, experiment.frames);
    start = stop - n + 1;

    experiment.totalFrames = experiment.frames;
    experiment.frames = n;
    experiment.start = start;
    experiment.stop = stop;
  }

  if (experiment) {
    if (experiment.has_segmentation) {
      // Empty array to be filled in
      experiment.segmentationData = [];
    }
    else {
      // Create data with no regions
      experiment.segmentationData = [];

      for (let i = experiment.start; i <= experiment.stop; i++) {
        experiment.segmentationData.push({
          frame: i,
          edited: false,
          regions: []
        });
      }
    }    

    if (experiment.labels) experiment.labels.sort();
  }

  resetLoading();  
}

function experimentLocked(info) {
  experiment = {
    locked: true,
    locked_by: info.locked_by
  }

  loading = null;
}

function receiveFrame(i, image) {
  if (!experiment.images) return;

  experiment.images[i] = image;
  loading.framesLoaded++;

  updateLoading();
}

function receiveSegmentationFrame(frame, regions) {
  if (!experiment.segmentationData) return;

  if (Array.isArray(regions)) {
    // Process vertices
    regions.forEach(region => {
      const vertices = region.vertices;

      // Convert to numbers
      vertices.forEach(function (vertex) {
        vertex[0] = +vertex[0];
        vertex[1] = +vertex[1];
      });

      // Get extent
      const x = vertices.map(vertex => vertex[0]);
      const y = vertices.map(vertex => vertex[1]);

      region.min = [
        x.reduce((p, c) => Math.min(p, c)),
        y.reduce((p, c) => Math.min(p, c))
      ];

      region.max = [
        x.reduce((p, c) => Math.max(p, c)),
        y.reduce((p, c) =>  Math.max(p, c))
      ];

      region.center = [
        x.reduce((p, c) => p + c) / x.length,
        y.reduce((p, c) => p + c) / y.length
      ];
    });
  }
  else {
    regions = [];
  }

  // Create an RBush tree for these regions
  const tree = new rbush();
  updateRBush(tree, regions);

  experiment.segmentationData[frame] = {
    frame: experiment.start + frame,
    edited: false,
    regions: regions,
    tree: tree
  };

  loading.segFramesLoaded++;

  if (loading.segFramesLoaded === experiment.frames) {
    generateTrajectoryIds();

    pushHistory();
  }

  updateLoading();
}

function updateRBush(tree, regions) {
  tree.clear();
  tree.load(regions.map(region => {
    return {
      minX: region.min[0],
      minY: region.min[1],
      maxX: region.max[0],
      maxY: region.max[1],
      region: region    
    };
  }));
}

function generateTrajectoryIds() {
  // Sanity check for object ids
  experiment.segmentationData.forEach(frame => {
    const ids = frame.regions.map(region => region.id);    
    const duplicates = ids.filter((id, i, a) => a.indexOf(id) !== i)

    if (duplicates.length > 0) {
      console.log("ERROR: DUPLICATE OBJECT IDS!");
      console.log(frame);
      console.log(duplicates);
    }
  });

  // Remove any existing ids
  experiment.segmentationData.forEach(frame => {
    frame.regions.forEach(region => region.trajectory_id = null);
  });

  // Use link id to generate trajectory ids
  let counter = 0;
  experiment.segmentationData.slice().reverse().forEach((frame, i, a) => {
    frame.regions.forEach(region => {
      if (!region.trajectory_id || region.trajectory_id === "collision") {
        const id = ("" + counter++).padStart(4, "0");
        region.trajectory_id = "trajectory_" + id;          
      }

      if (i < a.length - 1 && region.link_id) {
        let linked = a[i + 1].regions.filter(r => r.id === region.link_id);

        if (linked.length > 0) {
          linked = linked[0];

          // Check for collisions
          if (linked.trajectory_id) linked.trajectory_id = "collision";
          else linked.trajectory_id = region.trajectory_id;
        }
        else {
          console.log("Invalid link_id: " + region.link_id);
          console.log(linked);
          console.log(region);
          console.log(frame);
          console.log(experiment.segmentationData);
        }
      }
    });
  });

  // Create graph
  updateTrajectoryGraph();
}

function updateTrajectoryGraph() {
  const frames = experiment.segmentationData;
  const zoomPoint = settings.zoomPoint;
  const zoom = settings.zoom;

  // Find trajectories with visible regions
  let visibleTrajectories = null;
  
  if (zoomPoint) {
    visibleTrajectories = new Set();

    const z = 1 / zoom / 2,
          bb = [zoomPoint[0] - z, zoomPoint[1] - z, 
                zoomPoint[0] + z, zoomPoint[1] + z];                  

    frames.forEach(frame => {
      frame.regions.forEach(region => {
        for (let i = 0; i < region.vertices.length; i++) {
          const v = region.vertices[i];

          if (v[0] >= bb[0] && v[0] <= bb[2] &&
              v[1] >= bb[1] && v[1] <= bb[3]) {
            visibleTrajectories.add(region.trajectory_id);
            return;
          }
        }
      });
    });

    if (visibleTrajectories.size === 0) {
      experiment.trajectoryGraph = {
        nodes: [],
        links: []
      };
  
      return;
    }
  }

  // Nodes with visible trajectories
  const visibleRegions = frames.map(frame => {
    return frame.regions.filter(region => {
      return visibleTrajectories ? visibleTrajectories.has(region.trajectory_id) : true;
    });
  });

  // Create nodes from regions for tree layout
  const treeNodes = [{
    // Root
    id: "root"
  }].concat(visibleRegions.map((frame, i) => {
    // Dummy node per frame
    return {
      id: id(i, "dummy"),
      parentId: i === 0 ? "root" : id(i - 1, "dummy")
    };
  })).concat(d3.merge(visibleRegions.map((frame, i, frames) => {  
    // Nodes for visible trajectories    
    return frame.map(region => {      
      const linked = i === 0 || !region.link_id ? false :
          frames[i - 1].map(region => region.id).indexOf(region.link_id) === -1 ? false :
          true;

      return {
        id: id(i, region.id),
        parentId: i === 0 ? "root" :
            linked ? id(i - 1, region.link_id) :
            id(i - 1, "dummy"),              
        region: region,
        frameIndex: i
      };
    });
  })));

  // Create the tree
  const root = d3.stratify()(treeNodes);

  root.each(node => {
    node.num = node.descendants().length;
  });

  root.sort((a, b) => {
    const va = a.height - a.num;
    const vb = b.height - b.num;

    return d3.ascending(a.height, b.height) || d3.descending(Math.abs(va), Math.abs(vb));
  });
 
  // Process tree data
  root.each(node => {
    // Value based on number of children
    node.value = !node.data.region ? 0 : node.children ? node.children.length : 1;
  });

  // Tree layout
  const padScale = 0.75;
  const tree = d3.tree()
      .nodeSize([1, 1])
      .separation((a, b) => (a.value + b.value) * padScale) 
      (root);    

  // Shift to start at 0 in x
  const xMin = d3.min(tree.descendants(), node => node.x - node.value / 2);
  tree.descendants().forEach(node => node.x -= xMin);
  const xMax = d3.max(tree.descendants(), node => node.x + node.value / 2);

  // Get nodes with regions
  const nodes = tree.descendants().filter(node => {
    return node.data.region;
  });

  // Get links
  const links = tree.links().filter(link => {
    return link.source.data.region && link.target.data.region;
  });

  experiment.trajectoryGraph = {
    nodes: nodes,
    links: links,
    xMax: xMax
  };
  
  function id(frameIndex, regionId) {
    return "frame" + frameIndex + "_" + regionId;
  }
}

function updateTracking(trackingData) {
  trackingData.forEach(trackFrame => {
    let segFrame = experiment.segmentationData.filter(segFrame => segFrame.frame === trackFrame.frame_no);
    
    if (segFrame.length === 0) return;
    segFrame = segFrame[0];   

    trackFrame.region_ids.forEach(ids => {
      for (let i = 0; i < segFrame.regions.length; i++) {
        const region = segFrame.regions[i];
        if (region.id === ids.id) {
          region.link_id = ids.link_id;
        }
      }
    });
  });

  generateTrajectoryIds();
}

function resetLoading() {
  loading = {
    framesLoaded: 0,
    numFrames: experiment.frames ? experiment.frames : 0,
    segFramesLoaded: 0,
    numSegFrames: experiment.frames && experiment.has_segmentation ? experiment.frames : 0
  };
}

function updateLoading() {
  if (!experiment.frames) {    
    return;
  }

  const total = loading.numFrames + loading.numSegFrames;

  if (loading.framesLoaded + loading.segFramesLoaded >= total) {
    loading = null;
    resetPlayback();
  }
}

function loadFrames(startFrame) {
  let n = settings.framesToLoad;

  let stop = Math.min(startFrame + n - 1, experiment.totalFrames);
  let start = Math.max(stop - n + 1, 1);

  updateFrames(start, stop);
}

function advanceFrames() {
  let n = settings.framesToLoad;
  let overlap = settings.frameOverlap;

  let stop = Math.min(experiment.stop + n - overlap, experiment.totalFrames);
  let start = Math.max(stop - n + 1, 1);

  updateFrames(start, stop);
}

function reverseFrames() {
  let n = settings.framesToLoad;
  let overlap = settings.frameOverlap;

  let start = Math.max(experiment.start - n + overlap, 1);
  let stop = Math.min(start + n - 1, experiment.totalFrames);

  updateFrames(start, stop);
}

function updateFrames(start, stop) {
  experiment.start = start;
  experiment.stop = stop;
  experiment.frames = stop - start + 1;

  setExperiment(experiment);

  reset();
  setPlay(false);
}

function resetPlayback() {
  playback.loop = "rock";
  playback.frame = 0;
  playback.direction = 1;

  setPlay(true);
}

function skipBackward() {
  setFrame(0);
}

function skipForward() {
  setFrame(experiment.frames - 1);
}

function togglePlay() {
  setPlay(!playback.play);
}

function cycleLoop() {
  switch (playback.loop) {
    case "loop": playback.loop = "rock"; break;
    case "rock": playback.loop = "none"; break;
    default: playback.loop = "loop";
  }

  playback.direction = 1;
}

function setFrame(frame) {
  playback.frame = Math.max(0, Math.min(frame, experiment.frames - 1));

  setPlay(false);
}

function frameDelta(delta) {
  setFrame(playback.frame + delta);
}

function fastForward() {
  setFrame(experiment.frames - 1);
}

function setPlay(play) {
  playback.play = play;

  if (playback.play && !timer) {
    createTimer();
  }
  else if (timer) {
    removeTimer();
  }
}

function createTimer() {
  timer = setInterval(function () {
    playback.frame += playback.direction;

    if (playback.frame >= experiment.frames) {
      if (playback.loop === "loop") {
        playback.frame = 0;
      }
      else if (playback.loop === "rock") {
        playback.frame = experiment.frames - 1;
        playback.direction = -1;
      }
      else {
        playback.frame = experiment.frames - 1;
        setPlay(false);
      }
    }
    else if (playback.frame < 0) {
      // Should only happen if rocking
      playback.frame = 0;
      playback.direction = 1;
    }

    DataStore.emitChange();
  }, 1 / playback.frameRate * 1000);
}

function removeTimer() {
  clearInterval(timer);
  timer = null;
}

function setFrameRate(frameRate) {
  playback.frameRate = frameRate;

  if (timer) {
    removeTimer();
    createTimer();
  }
}

function highlightRegion(frame, region) {
  experiment.segmentationData.forEach(frame => {
    frame.regions.forEach(region => region.highlight = false);
  });

  if (region) region.highlight = true;
  if (frame !== null && frame >= 0) setFrame(frame);

//  pushHistory();
}

function setZoom(newZoom, newFilmstripZoom, newZoomPoint) {
  settings.zoom = newZoom;
  settings.filmstripZoom = newFilmstripZoom;
  settings.zoomPoint = newZoomPoint;

  updateTrajectoryGraph();
}

function animateZoom(newZoom, newFilmstripZoom, newZoomPoint) {
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function world2screen(p, t, s) {
    return [
      (p[0] - t[0]) * s,
      (p[1] - t[1]) * s,
    ];
  }

  const oldZoom = settings.zoom;
  const oldFilmstripZoom = settings.filmstripZoom;

  const point = newZoom >= oldZoom ? newZoomPoint : settings.zoomPoint.slice();
  const screen = newZoom >= oldZoom ? [0, 0] : world2screen(settings.zoomPoint, newZoomPoint, 1);

  const n = 10;
  let i = 1;
  const interval = setInterval(() => {
    const t = i / n;

    const tx = [settings.zoomPoint[0], settings.zoomPoint[1]];

    const tps1 = world2screen(point, tx, settings.zoom);
    const ps1 = [
      lerp(tps1[0], screen[0], t), 
      lerp(tps1[1], screen[1], t) 
    ];

    settings.zoom = lerp(oldZoom, newZoom, t);
    settings.filmstripZoom = lerp(oldFilmstripZoom, newFilmstripZoom, t);
    
    const ps2 = world2screen(point, tx, settings.zoom);

    let tx2 = [ps2[0] - ps1[0], ps2[1] - ps1[1]];
    tx2[0] /= settings.zoom;
    tx2[1] /= settings.zoom;

    settings.zoomPoint[0] += tx2[0];
    settings.zoomPoint[1] += tx2[1];

    i++;

    if (i > n) {
      clearInterval(interval);
    }

    DataStore.emitChange();
  }, 10);
}

function selectRegion(frame, region) {
  if (region) {
    setFrame(frame);
    experiment.centerRegion = region;

    const { zoom, filmstripZoom } = getZoomLevels(region);    
//    animateZoom(zoom, filmstripZoom, region.center.slice());
    setZoom(zoom, filmstripZoom, region.center.slice());

//    setEditMode("vertex");    
  }
  else {
    experiment.centerRegion = null;

//    animateZoom(1, 1, [0.5, 0.5]);
    setZoom(1, 1, [0.5, 0.5]);

    setEditMode("regionSelect");
  }

  pushHistory();
}

function selectZoomPoint(frame, point) {
  setFrame(frame);
  experiment.centerRegion = null;

  const { zoom, filmstripZoom } = getZoomLevels(point);
//  animateZoom(zoom, filmstripZoom, point);
  setZoom(zoom, filmstripZoom, point);

  setEditMode("vertex");

  pushHistory();
}

function translate(point) {
  settings.zoomPoint = point.slice();

  updateTrajectoryGraph();
}

function editRegion(frame, region) {
  if (region) {
    // Clear done
    if (region.done) {
      regionDone(region, false);
    }

    region.unsavedEdit = true;
    experiment.segmentationData[frame].edited = true;

    const remove = experiment.segmentationData[frame].regions.indexOf(region) === -1;

    experiment.lastEdit = {
      type: remove ? "remove" : "edit",
      frame: experiment.segmentationData[frame].frame,
      id: region.id
    };

    // Update rbush
    updateRBush(experiment.segmentationData[frame].tree, experiment.segmentationData[frame].regions);
  }

  // Update trajectory ids if necessary
  switch (settings.editMode) {
    case "regionEdit":
    case "regionSplit":
    case "regionMerge":
    case "regionPaste":  
        generateTrajectoryIds();
        break;
  }

  pushHistory();

  // Change edit mode
  switch (settings.editMode) {
    case "regionCopy":
      setEditMode("regionPaste");
      break;

    case "regionEdit":
      if (experiment.segmentationData[frame].regions.indexOf(region) !== -1) {
        // Region was added
        setEditMode("vertex");
      }
      break;

    case "regionSplit":
    case "regionMerge":
    case "regionTrim":
      setEditMode("vertex");
      break;
  }
}

function linkRegion(frame, region) {
  if (linking.region) linking.region.isLinkRegion = false;

  // Clear done
  if (region.done) {
    regionDone(region, false);
  }

  switch (settings.editMode) {
    case "regionLink":
      if (!region) {
        // Clear linking region
        linking.frame = -1;
        linking.region = null;
      }
      else if (!linking.region) {
        // Set linking region
        linking.frame = frame;
        linking.region = region;
        
        region.isLinkRegion = true;
      }
      else if (frame === linking.frame - 1) {
        // XXX: ALLOW THIS?        
        // Link
        linking.region.link_id = region.id;
        linking.region.manual_link = true;
        linking.region.unsavedEdit = true;

        experiment.segmentationData[frame].edited = true;

        linking.frame = frame;
        linking.region = region;

        region.isLinkRegion = true;

        generateTrajectoryIds();        

        pushHistory();
      } 
      else if (frame === linking.frame + 1) {
        // Link
        region.link_id = linking.region.id;
        region.manual_link = true;
        region.unsavedEdit = true;

        experiment.segmentationData[frame].edited = true;

        linking.frame = frame;
        linking.region = region;

        region.isLinkRegion = true;

        generateTrajectoryIds();

        pushHistory();
      }

      break;

    case "regionBreakLink":
      region.link_id = null;
      region.manual_link = true;
      region.unsavedEdit = true;

      experiment.segmentationData[frame].edited = true;

      generateTrajectoryIds();

      pushHistory();

      break;
  }
}

function regionDone(region, done) {
  const id = region.trajectory_id;

  experiment.segmentationData.forEach(frame => {
    frame.regions.forEach(region => {
      if (region.trajectory_id === id) {
        region.done = done;
        region.unsavedEdit = true;
        frame.edited = true;
      }
    });
  });
}

function resetHistory() {
  history.edits = [];
  history.index = -1;
}

function pushHistory() {
  // Remove anything more recent
  history.edits.splice(history.index + 1);

  // Save segmentation frames
  const frameIndex = playback.frame;
  const savedFrames = [{
    index: frameIndex,
    frame: cloneData(experiment.segmentationData[frameIndex])
  }];

  if (frameIndex > 0) {
    savedFrames.push({
      index: frameIndex - 1,
      frame: cloneData(experiment.segmentationData[frameIndex - 1])
    });
  }

  if (frameIndex < experiment.segmentationData.length - 1) {
    savedFrames.push({
      index: frameIndex + 1,
      frame: cloneData(experiment.segmentationData[frameIndex + 1])
    });
  }

  // Add to the end
  history.index = history.edits.push({
    segmentationData: savedFrames,
    settings: cloneData(settings)
  }) - 1;

  // Remove first if too long
  if (history.edits.length > 10) {
    history.edits.shift();
  }
}

function undoHistory() {
  if (history.index > 0) {
    history.index--;

    getHistory();
  }
}

function redoHistory() {
  if (history.index < history.edits.length - 1) {
    history.index++;

    getHistory();
  }
}

function getHistory() {
  let edit = history.edits[history.index];

  edit.segmentationData.forEach(savedFrame => {
    const frame = cloneData(savedFrame.frame);
    experiment.segmentationData[savedFrame.index] = frame;

    // Regenerate rtree
    frame.tree = new rbush();
    updateRBush(frame.tree, frame.regions);
  });

  settings = cloneData(edit.settings);

  // XXX: ANY OF THIS NECESSARY NOW?
//  updateSelectedRegionFromHistory();
}

function updateSelectedRegionFromHistory() {
  // Get selected region, if any
  let frame = -1;
  let selectedRegion = null;

  for (let i = 0; i < experiment.segmentationData.length; i++) {
    let data = experiment.segmentationData[i];

    for (let j = 0; j < data.regions.length; j++) {
      let region = data.regions[j];

      if (region.selected) {
        frame = i;
        selectedRegion = region;
      }
    }
  }

  if (selectedRegion) {
    experiment.selectedRegion = {
      frame: frame,
      region: selectedRegion
    };
  }
  else {
    experiment.selectedRegion = null;
  }
}

function cloneData(d) {
  // XXX: Using to/from JSON to clone, maybe look at other approaches?
  return JSON.parse(JSON.stringify(d));
}

function saveSegmentationData() {
  // Clear edited flags
  experiment.segmentationData.forEach(frame => {
    frame.edited = false;

    frame.regions.forEach(region => {
      if (region.unsavedEdit) {
        region.edited = true;
        region.unsavedEdit = false;
      }
    });
  });
}

function toggleStabilize() {
  settings.stabilize = !settings.stabilize;
}

function setFramesToLoad(framesToLoad) {
  settings.framesToLoad = framesToLoad;
}

function setFrameOverlap(frameOverlap) {
  settings.frameOverlap = frameOverlap;
}

function getZoomLevels(item) {
  if (settings.zoomDefault && settings.filmstripZoomDefault) {
    return {
      zoom: settings.zoomDefault,
      filmstripZoom: settings.filmstripZoomDefault
    };
  }

  // Default
  let s = 0.01;

  if (item.length) {
    // Point, get average region size
    let w = 0.0;
    let h = 0.0;
    let n = 0;

    experiment.segmentationData.forEach(frame => {
      frame.regions.forEach(region => {
        w += region.max[0] - region.min[0];
        h += region.max[1] - region.min[1];
        n++;
      });
    });

    if (n > 0) {
      w /= n;
      h /= n;
      s = Math.max(w, h);
    }
  }
  else {
    // Region
    const w = item.max[0] - item.min[0];
    const h = item.max[1] - item.min[1];
    s = Math.max(w, h);
  }

  const zoom = 1 / (s * 2);

  if (!settings.zoomDefault) settings.zoomDefault = zoom;
  if (!settings.filmstripZoomDefault) settings.filmstripZoomDefault = zoom / 2;

  return {
    zoom: settings.zoomDefault,
    filmstripZoom: settings.filmstripZoomDefault
  };
}

function zoom(view, direction) {
  // Min and max zoom values
  const minZoom = 1;
  const maxZoom = 50;

  // Zoom in or out
  let s = 1.5;
  if (direction === "out") s = 1 / s;

  if (view === "filmstrip") {
    // Calculate the zoom
    const newZoom = settings.filmstripZoom * s;

    // Check for valid zoom amount
    if (newZoom >= minZoom && newZoom <= maxZoom) {
      settings.filmstripZoomDefault = newZoom;
      
//      animateZoom(settings.zoom, newZoom, settings.zoomPoint);
      setZoom(settings.zoom, newZoom, settings.zoomPoint);
    }
  }
  else {
    // Calculate the zoom
    const newZoom = settings.zoom * s;

    // Check for valid zoom amount
    if (newZoom >= minZoom && newZoom <= maxZoom) {
      settings.zoomDefault = newZoom;
      
//      animateZoom(newZoom, settings.filmstripZoom, settings.zoomPoint);
      setZoom(newZoom, settings.filmstripZoom, settings.zoomPoint);
    }
  }  
}

function setEditMode(mode, option) {
  settings.editMode = mode;

  if (mode === "regionLabel") settings.currentLabel = option;

  if (linking.region) linking.region.isLinkRegion = false;
  linking.frame = -1;
  linking.region = null;

//  pushHistory();
}

function receiveScore(score, totalScore, timeStamp) {
  userInfo.score = score;
  userInfo.total_score = totalScore;
  userInfo.score_time_stamp = timeStamp;
}

const DataStore = assign({}, EventEmitter.prototype, {
  emitChange: function () {
    this.emit(CHANGE_EVENT);
  },
  addChangeListener: function (callback) {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: function (callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },
  getUserInfo: function () {
    return userInfo;
  },
  getExperimentList: function () {
    return experimentList;
  },
  getExperiment: function () {
    return experiment;
  },
  getHistory: function () {
    return history;
  },
  getSettings: function () {
    return settings;
  },
  getLoading: function () {
    return loading;
  },
  getPlayback: function () {
    return playback;
  },
  getLinking: function () {
    return linking;
  }
});

DataStore.dispatchToken = AppDispatcher.register(action => {
  switch (action.actionType) {
    case Constants.RECEIVE_USER_INFO:
      setUserInfo(action.userInfo);
      DataStore.emitChange();
      break;

    case Constants.RECEIVE_EXPERIMENT_LIST:
      setExperimentList(action.experimentList);
      DataStore.emitChange();
      break;

    case Constants.SELECT_EXPERIMENT:
      selectExperiment(action.experiment);
      DataStore.emitChange();
      break;

    case Constants.RECEIVE_EXPERIMENT:
      setExperiment(action.experiment);
      skipBackward();
      DataStore.emitChange();
      break;

    case Constants.EXPERIMENT_LOCKED:
      experimentLocked(action.info);
      DataStore.emitChange();
      break;

    case Constants.RECEIVE_FRAME:
      receiveFrame(action.frame, action.image);
      DataStore.emitChange();
      break;

    case Constants.RECEIVE_SEGMENTATION_FRAME:
      receiveSegmentationFrame(action.frame, action.segmentations);
      DataStore.emitChange();
      break;

    case Constants.UPDATE_TRACKING:
      updateTracking(action.trackingData);
      DataStore.emitChange();
      break;

    case Constants.LOAD_FRAMES:
      loadFrames(action.startFrame);
      DataStore.emitChange();
      break;

    case Constants.ADVANCE_FRAMES:
      advanceFrames();
      DataStore.emitChange();
      break;

    case Constants.REVERSE_FRAMES:
      reverseFrames();
      DataStore.emitChange();
      break;

    case Constants.SKIP_BACKWARD:
      skipBackward();
      DataStore.emitChange();
      break;

    case Constants.SKIP_FORWARD:
      skipForward();
      DataStore.emitChange();
      break;

    case Constants.TOGGLE_PLAY:
      togglePlay();
      DataStore.emitChange();
      break;

    case Constants.CYCLE_LOOP:
      cycleLoop();
      DataStore.emitChange();
      break;

    case Constants.SET_FRAME:
      setFrame(action.frame);
      DataStore.emitChange();
      break;

    case Constants.FRAME_DELTA:
      frameDelta(action.delta);
      DataStore.emitChange();
      break;

    case Constants.FAST_FORWARD:
      fastForward();
      DataStore.emitChange();
      break;

    case Constants.SELECT_FRAME_RATE:
      setFrameRate(action.frameRate);
      DataStore.emitChange();
      break;

    case Constants.HIGHLIGHT_REGION:
      highlightRegion(action.frame, action.region);
      DataStore.emitChange();
      break;

    case Constants.SELECT_REGION:
      selectRegion(action.frame, action.region);
      DataStore.emitChange();
      break;

    case Constants.SELECT_ZOOM_POINT:
      selectZoomPoint(action.frame, action.point);
      DataStore.emitChange();
      break;

    case Constants.TRANSLATE:
      translate(action.point);
      DataStore.emitChange();
      break;

    case Constants.EDIT_REGION:
      editRegion(action.frame, action.region);
      DataStore.emitChange();
      break;

    case Constants.LINK_REGION:
      linkRegion(action.frame, action.region);
      DataStore.emitChange();
      break;

    case Constants.REGION_DONE:
      regionDone(action.region, action.done);
      DataStore.emitChange();
      break;

    case Constants.SAVE_SEGMENTATION_DATA:
      saveSegmentationData();
      DataStore.emitChange();
      break;

    case Constants.UNDO_HISTORY:
      undoHistory();
      DataStore.emitChange();
      break;

    case Constants.REDO_HISTORY:
      redoHistory();
      DataStore.emitChange();
      break;

    case Constants.TOGGLE_STABILIZE:
      toggleStabilize();
      DataStore.emitChange();
      break;

    case Constants.SET_FRAMES_TO_LOAD:
      setFramesToLoad(action.framesToLoad);
      DataStore.emitChange();
      break;

    case Constants.SET_FRAME_OVERLAP:
      setFrameOverlap(action.frameOverlap);
      DataStore.emitChange();
      break;

    case Constants.ZOOM:
      zoom(action.view, action.direction);
      DataStore.emitChange();
      break;

    case Constants.SET_EDIT_MODE:
      setEditMode(action.mode, action.option);
      DataStore.emitChange();
      break;

    case Constants.RECEIVE_SCORE:
      receiveScore(action.score, action.totalScore, action.timeStamp);
      DataStore.emitChange();
      break;

    case Constants.KEY_PRESS: {
      switch (action.key) {
        case "a":
          setEditMode("regionEdit");
          DataStore.emitChange();
          break;

        case "e":
          setEditMode("vertex");
          DataStore.emitChange();
          break;

        case "r":
          setEditMode("regionRotate");
          DataStore.emitChange();
          break;

        case "t":
          setEditMode("regionMove");
          DataStore.emitChange();
          break;

        case "c":
          setEditMode("regionSelect");
          DataStore.emitChange();
          break;

        case "q":
          setEditMode("regionCopy");
          DataStore.emitChange();
          break;

        case "p":
          setEditMode("regionPaste");
          DataStore.emitChange();
          break;

        case "s":
          setEditMode("regionSplit");
          DataStore.emitChange();
          break;

        case "d":
          setEditMode("regionMerge");
          DataStore.emitChange();
          break;

        case "w":
          setEditMode("regionTrim");
          DataStore.emitChange();
          break;
          
        case "+":
        case "=":
          zoom("edit", "in");
          DataStore.emitChange();
          break;

        case "-":
          zoom("edit", "out");
          DataStore.emitChange();
          break;

        case "f":
          setEditMode("regionLink");
          DataStore.emitChange();
          break;

        case "g":
          setEditMode("regionBreakLink");
          DataStore.emitChange();
          break;

        case "z":
          if (action.ctrl) {
            undoHistory();
            DataStore.emitChange();
          }
          break;

        case "y":
          if (action.ctrl) {
            redoHistory();
            DataStore.emitChange();
          }
          break;

        case "ArrowLeft":
          frameDelta(-1);
          DataStore.emitChange();
          break;

        case "ArrowRight":
          frameDelta(1);
          DataStore.emitChange();
          break;

        case "k":
          settings.showTrajectories = !settings.showTrajectories;
          DataStore.emitChange();
          break;
      }
    }
  }
});

export default DataStore;
