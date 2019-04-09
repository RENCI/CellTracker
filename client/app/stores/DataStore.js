var AppDispatcher = require("../dispatcher/AppDispatcher");
var EventEmitter = require("events").EventEmitter;
var assign = require("object-assign");
var Constants = require("../constants/Constants");

var CHANGE_EVENT = "change";

// List of available experiments
var experimentList = [];

// Active experiment
var experiment = null;

// User edit history
var history = {
  index: -1,
  edits: []
};

// Loading information
var framesLoaded = 0;
var segFramesLoaded = 0;
var loading = null;

// Playback
var playback = {
  play: false,
  loop: "none",
  frame: 0,
  frameRate: 4,
  direction: 1
};
var timer = null;

// Settings
var settings = {
  editZoom: 1,
  playbackZoom: 1,
  zoomPoint: [0, 0],
  editMode: "vertex",
  stabilize: true
};

function setExperimentList(newList) {
  experimentList = newList;
  experiment = null;

  // XXX: Decorate with user-specific info here, until such info is supplied by the server
  experimentList.forEach(function(experiment) {
    // XXX: Use a fraction since we don't know the number of frames yet
    experiment.userProgress = Math.random();
  });
}

function selectExperiment(newExperiment) {
  experiment = newExperiment;

  reset();
}

function reset() {
  resetHistory();

  framesLoaded = 0;
  segFramesLoaded = 0;

  updateLoading();
}

function setExperiment(newExperiment) {
  experiment = newExperiment;

  if (experiment) {
    experiment.name = experimentList.filter(function (e) {
      return e.id === experiment.id;
    })[0].name;
    experiment.images = [];

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
  }
}

function receiveFrame(i, image) {
  experiment.images[i] = image;
  framesLoaded++;

  updateLoading();
}

function receiveSegmentationFrame(frame, regions) {
  if (Array.isArray(regions)) {
    // Process vertices
    regions.forEach(function (region) {
      var vertices = region.vertices;

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

  experiment.segmentationData[frame] = {
    frame: experiment.start + frame,
    edited: false,
    regions: regions
  };

  segFramesLoaded++;

  if (segFramesLoaded === experiment.frames) {
    generateTrajectoryIds();

    pushHistory();
  }

  updateLoading();
}

function generateTrajectoryIds() {
  // Remove any existing ids
  experiment.segmentationData.forEach(frame => {
    frame.regions.forEach(region => region.trajectory_id = null);
  });

  // Use link id to generate trajectory ids
  let counter = 0;
  experiment.segmentationData.forEach((frame, i, a) => {
    frame.regions.forEach(region => {
      if (!region.trajectory_id || region.trajectory_id === "collision") {
        region.trajectory_id = "trajectory" + counter++;          
      }

      if (i < a.length - 1 && region.link_id) {
        let linked = a[i + 1].regions.filter(r => r.id === region.link_id);

        if (linked.length > 0) {
          linked = linked[0];

          // Check for collisions
          if (linked.trajectory_id) linked.trajectory_id = "collision";
          else linked.trajectory_id = region.trajectory_id;
        }
      }
    });
  });
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
          region.link_id = ids.linked_id;
        }
      }
    });
  });

  generateTrajectoryIds();
}

function updateLoading() {
  if (!experiment.frames) {
    // No info yet
    loading = {
      frame: 0,
      numFrames: 1,
      segFrame: 0,
      numSegFrames: 1
    };

    return;
  }

  var numSegFrames = experiment.has_segmentation ? experiment.frames : 0;
  var total = experiment.frames + numSegFrames;

  loading = framesLoaded + segFramesLoaded < total ? {
    frame: Math.min(experiment.frames, framesLoaded + 1),
    numFrames: experiment.frames,
    segFrame: Math.min(numSegFrames, segFramesLoaded + 1),
    numSegFrames: numSegFrames
  } : null;

  if (!loading) resetPlayback();
}

function advanceFrames() {
  let n = experiment.frames;
  let overlap = 2;

  let stop = Math.min(experiment.stop + n - overlap, experiment.totalFrames);
  let start = Math.max(stop - n + 1, 1);

  updateFrames(start, stop);
}

function reverseFrames() {
  let n = experiment.frames;
  let overlap = 2;

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

function selectRegion(frame, region) {
  if (region) {
    experiment.editFrame = frame;
    experiment.centerRegion = region;

    setZoomLevels(region);
  }
  else {
    experiment.editFrame = null;
    experiment.centerRegion = null;
  }

  pushHistory();
}

function selectZoomPoint(frame, point) {
  experiment.editFrame = frame;
  experiment.centerRegion = null;

  setZoomLevels(point)

  pushHistory();
}

function editRegion(frame, region) {
  region.unsavedEdit = true;
  experiment.segmentationData[frame].edited = true;

  pushHistory();

  setEditMode("vertex");
}

function resetHistory() {
  history.edits = [];
  history.index = -1;
}

function pushHistory() {
  // Remove anything more recent
  history.edits.splice(history.index + 1);

  // Add to the end
  history.index = history.edits.push({
    segmentationData: cloneData(experiment.segmentationData),
    editZoom: settings.editZoom,
    playbackZoom: settings.playbackZoom
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

  experiment.segmentationData = cloneData(edit.segmentationData);
  settings.editZoom = edit.editZoom;
  settings.playbackZoom = edit.playbackZoom;

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
  experiment.segmentationData.forEach(function (frame) {
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

function setZoomLevels(item) {
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

    settings.zoomPoint = item;
  }
  else {
    // Region
    const w = item.max[0] - item.min[0];
    const h = item.max[1] - item.min[1];
    s = Math.max(w, h);

    settings.zoomPoint = item.center
  }

  const zoom = 1 / (s * 2);

  settings.editZoom = zoom
  settings.playbackZoom = zoom / 2;
}

function zoom(view, direction) {
  // Min and max zoom values
  var minZoom = 1;
  var maxZoom = 50;

  // Set the key for the parameter to adjust
  var key = view === "playback" ? "playbackZoom" : "editZoom";

  // Zoom in or out
  var s = 1.5;
  if (direction === "out") s = 1 / s;

  // Calculate the zoom
  var newZoom = settings[key] * s;

  // Check for valid zoom amount
  if (newZoom >= minZoom && newZoom <= maxZoom) {
    settings[key] = newZoom;
  }
}

function setEditMode(mode) {
  settings.editMode = mode;

  pushHistory();
}

var DataStore = assign({}, EventEmitter.prototype, {
  emitChange: function () {
    this.emit(CHANGE_EVENT);
  },
  addChangeListener: function (callback) {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: function (callback) {
    this.removeListener(CHANGE_EVENT, callback);
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
  }
});

DataStore.dispatchToken = AppDispatcher.register(function (action) {
  switch (action.actionType) {
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

    case Constants.SELECT_REGION:
      selectRegion(action.frame, action.region);
      DataStore.emitChange();
      break;

    case Constants.SELECT_ZOOM_POINT:
      selectZoomPoint(action.frame, action.point);
      DataStore.emitChange();
      break;

    case Constants.EDIT_REGION:
      editRegion(action.frame, action.region);
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

    case Constants.ZOOM:
      zoom(action.view, action.direction);
      DataStore.emitChange();
      break;

    case Constants.SET_EDIT_MODE:
      setEditMode(action.mode);
      DataStore.emitChange();
      break;
  }
});

module.exports = DataStore;
