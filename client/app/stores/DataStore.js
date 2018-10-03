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
var play = false;
var frame = 0;
var frameRate = 4;
var timer = null;

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
    experiment.images = [];
    experiment.segmentationData = experiment.hasSegmentation ? [] : null;

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
    region.vertices.forEach(function (vertex) {
      vertex[0] = +vertex[0];
      vertex[1] = +vertex[1];
    });
  });

  experiment.segmentationData[i] = frame;
  segFramesLoaded++;

  updateLoading();
}

function updateLoading() {
  var total = experiment.hasSegmentation ? experiment.frames * 2 : experiment.frames;

  loading = framesLoaded + segFramesLoaded < total ? {
    image: framesLoaded,
    numImages: experiment.frames,
    segmentation: segFramesLoaded,
    numSegmentation: experiment.hasSegmentation ? experiment.frames : 0
  } : null;
}

function stopPlay() {
  setFrame(0);
}

function togglePlay() {
  setPlay(!play);
}

function setFrame(newFrame) {
  frame = Math.max(0, Math.min(newFrame, experiment.frames - 1));

  setPlay(false);
}

function frameDelta(delta) {
  setFrame(frame + delta);
}

function fastForward() {
  setFrame(experiment.frames - 1);
}

function setPlay(newPlay) {
  play = newPlay;

  if (play && !timer) {
    createTimer();
  }
  else if (timer) {
    removeTimer();
  }
}

function createTimer() {
  timer = setInterval(function () {
    frame = Math.min(frame + 1, experiment.frames - 1);
    DataStore.emitChange();
  }, 1 / frameRate * 1000);
}

function removeTimer() {
  clearInterval(timer);
  timer = null;
}

function setFrameRate(newFrameRate) {
  frameRate = newFrameRate;

  if (timer) {
    removeTimer();
    createTimer();
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
  getLoading: function () {
    return loading;
  },
  getPlay: function () {
    return play;
  },
  getFrame: function () {
    return frame;
  },
  getFrameRate: function () {
    return frameRate;
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
      stopPlay();
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

    case Constants.STOP_PLAY:
      stopPlay();
      DataStore.emitChange();
      break;

    case Constants.TOGGLE_PLAY:
      togglePlay();
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
