var AppDispatcher = require("../dispatcher/AppDispatcher");
var Constants = require("../constants/Constants");
var WebAPIUtils = require("../utils/WebAPIUtils");
var DataStore = require("../stores/DataStore");

module.exports = {
  getExperimentList: function () {
    WebAPIUtils.getExperimentList();
  },
  selectExperiment: function (experiment) {
    AppDispatcher.dispatch({
      actionType: Constants.SELECT_EXPERIMENT,
      experiment: experiment
    });

    WebAPIUtils.getExperimentInfo(experiment);
  },
  advanceFrames: function () {
    AppDispatcher.dispatch({
      actionType: Constants.ADVANCE_FRAMES
    });

    WebAPIUtils.getFrames(DataStore.getExperiment());
  },
  reverseFrames: function () {
    AppDispatcher.dispatch({
      actionType: Constants.REVERSE_FRAMES
    });

    WebAPIUtils.getFrames(DataStore.getExperiment());
  },

  cycleLoop: function () {
    AppDispatcher.dispatch({
      actionType: Constants.CYCLE_LOOP
    });
  },
  skipBackward: function () {
    AppDispatcher.dispatch({
      actionType: Constants.SKIP_BACKWARD
    });
  },
  togglePlay: function () {
    AppDispatcher.dispatch({
      actionType: Constants.TOGGLE_PLAY
    });
  },
  skipForward: function () {
    AppDispatcher.dispatch({
      actionType: Constants.SKIP_FORWARD
    });
  },
  setFrame: function (frame) {
    AppDispatcher.dispatch({
      actionType: Constants.SET_FRAME,
      frame: frame
    });
  },
  frameDelta: function (delta) {
    AppDispatcher.dispatch({
      actionType: Constants.FRAME_DELTA,
      delta: delta
    });
  },
  fastForward: function () {
    AppDispatcher.dispatch({
      actionType: Constants.FAST_FORWARD
    });
  },
  selectFrameRate: function (frameRate) {
    AppDispatcher.dispatch({
      actionType: Constants.SELECT_FRAME_RATE,
      frameRate: frameRate
    });
  },

  highlightRegion: function (frame, region) {
    AppDispatcher.dispatch({
      actionType: Constants.HIGHLIGHT_REGION,
      frame: frame,
      region: region
    });
  },
  selectRegion: function (frame, region) {
    AppDispatcher.dispatch({
      actionType: Constants.SELECT_REGION,
      frame: frame,
      region: region
    });
  },
  selectZoomPoint: function (frame, point) {
    AppDispatcher.dispatch({
      actionType: Constants.SELECT_ZOOM_POINT,
      frame: frame,
      point: point
    });
  },
  editRegion: function (frame, region) {
    AppDispatcher.dispatch({
      actionType: Constants.EDIT_REGION,
      frame: frame,
      region: region
    });
  },
  saveSegmentationData: function (id, segmentationData) {
    WebAPIUtils.saveSegmentationData(id, segmentationData);

    AppDispatcher.dispatch({
      actionType: Constants.SAVE_SEGMENTATION_DATA
    });
  },
  undoHistory: function () {
    AppDispatcher.dispatch({
      actionType: Constants.UNDO_HISTORY
    });
  },
  redoHistory: function () {
    AppDispatcher.dispatch({
      actionType: Constants.REDO_HISTORY
    });
  },

  toggleStabilize: function () {
    AppDispatcher.dispatch({
      actionType: Constants.TOGGLE_STABILIZE
    });
  },

  zoom: function (view, direction) {
    AppDispatcher.dispatch({
      actionType: Constants.ZOOM,
      view: view,
      direction: direction
    });
  },

  setEditMode: function (mode) {
    AppDispatcher.dispatch({
      actionType: Constants.SET_EDIT_MODE,
      mode: mode
    });
  }
};
