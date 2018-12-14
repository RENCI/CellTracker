var AppDispatcher = require("../dispatcher/AppDispatcher");
var EventEmitter = require("events").EventEmitter;
var assign = require("object-assign");
var Constants = require("../constants/Constants");

var CHANGE_EVENT = "change";

// List of available experiments
var experimentList = [];

// Active experiment
var experiment = null;

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
  playbackZoom: 1
};

// Traces for this experiment
var traces = [];
var activeTrace = null;

function setExperimentList(newList) {
  experimentList = newList;
  experiment = null;
}

function setExperiment(newExperiment) {
  experiment = newExperiment;

  resetTraces();

  if (experiment) {
    experiment.name = experimentList.filter(function (e) {
      return e.id === experiment.id;
    })[0].name;
    experiment.images = [];
    experiment.segmentationData = experiment.hasSegmentation ? [] : null;

    // XXX: Currently not routing edits through the data store, so leaving as true for now.
    // Should be false until an edit has been made in the future.
    experiment.changesMade = true;

    framesLoaded = 0;
    segFramesLoaded = 0;

    updateLoading();
  }
}

function receiveFrame(i, frame) {
  experiment.images[i] = frame;
  framesLoaded++;

  updateLoading();
}

function receiveSegmentationFrame(i, frame) {
  // Process vertices
  frame.forEach(function (region) {
    var vertices = region.vertices;

    // Remove duplicate vertex at the end
    var v0 = vertices[0];
    var v1 = vertices[vertices.length - 1];

    if (v0[0] === v1[0] && v0[1] === v1[1]) {
      vertices.pop();
    }

    // Convert to numbers
    vertices.forEach(function (vertex) {
      vertex[0] = +vertex[0];
      vertex[1] = +vertex[1];
    });

    // Get extent
    var x = vertices.map(function (vertex) { return vertex[0]; });
    var y = vertices.map(function (vertex) { return vertex[1]; });

    region.min = [
      x.reduce(function(p, c) { return Math.min(p, c); }),
      y.reduce(function(p, c) { return Math.min(p, c); })
    ];

    region.max = [
      x.reduce(function(p, c) { return Math.max(p, c); }),
      y.reduce(function(p, c) { return Math.max(p, c); })
    ];

    region.center = [
      (region.min[0] + region.max[0]) / 2,
      (region.min[1] + region.max[1]) / 2
    ];
  });

  experiment.segmentationData[i] = frame;
  segFramesLoaded++;

  updateLoading();
}

function updateLoading() {
  var numSegFrames = experiment.hasSegmentation ? experiment.frames : 0;
  var total = experiment.frames + numSegFrames;

  loading = framesLoaded + segFramesLoaded < total ? {
    image: Math.max(experiment.frames, framesLoaded + 1),
    numImages: experiment.frames,
    segmentation: Math.max(numSegFrames, segFramesLoaded + 1),
    numSegmentation: numSegFrames
  } : null;

  if (!loading) resetPlayback();
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
  experiment.segmentationData.forEach(function (frame) {
    frame.forEach(function (region) {
      region.selected = false;
    });
  });

  if (region) {
    region.selected = true;
    experiment.selectedRegion = {
      region: region,
      frame: frame
    };

    setZoomLevels(region);
  }
  else {
    experiment.selectedRegion = null;
  }
}

function setZoomLevels(region) {
  var w = region.max[0] - region.min[0];
  var h = region.max[1] - region.min[1];

  var s = Math.max(w, h);

  settings.playbackZoom = 1 / (s * 3);
  settings.editZoom = 1 / (s * 1.5);
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

function addTrace() {
  traces.forEach(function (trace) {
    trace.active = false;
  });

  traces.push({
    name: "Trace " + (traces.length + 1),
    points: [],
    active: true
  });

  activeTrace = traces[traces.length - 1];
}

function resetTraces() {
  traces = [];

  addTrace();
}

function updateTrace(points) {
  activeTrace.points = points;
}

function selectTrace(index) {
  traces.forEach(function (trace, i) {
    trace.active = i === index;
  });
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
  getSettings: function () {
    return settings;
  },
  getLoading: function () {
    return loading;
  },
  getPlayback: function () {
    return playback;
  },
  getTraces: function () {
    return traces;
  }
});

DataStore.dispatchToken = AppDispatcher.register(function (action) {
  switch (action.actionType) {
    case Constants.RECEIVE_EXPERIMENT_LIST:
      setExperimentList(action.experimentList);
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
      receiveSegmentationFrame(action.frame, action.segmentation);
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

    case Constants.ZOOM:
      zoom(action.view, action.direction);
      DataStore.emitChange();
      break;

    case Constants.ADD_TRACE:
      addTrace();
      DataStore.emitChange();
      break;

    case Constants.UPDATE_TRACE:
      updateTrace(action.points);
      DataStore.emitChange();
      break;

    case Constants.SELECT_TRACE:
      selectTrace(action.index);
      DataStore.emitChange();
      break;
  }
});

module.exports = DataStore;
