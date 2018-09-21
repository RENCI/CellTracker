var AppDispatcher = require("../dispatcher/AppDispatcher");
var Constants = require("../constants/Constants");
var WebAPIUtils = require("../utils/WebAPIUtils");
var DataStore = require("../stores/DataStore");

module.exports = {
  getExperimentList: function () {
    WebAPIUtils.getExperimentList();
  },
  selectExperiment: function (id) {
    WebAPIUtils.getExperimentInfo(id);
  },
  getSegmentationData: function (id, frames) {
    WebAPIUtils.getSegmentationData(id, frames);
  },

  updateLoading: function (frame, numFrames) {
    AppDispatcher.dispatch({
      actionType: Constants.UPDATE_LOADING,
      frame: frame,
      numFrames: numFrames
    });
  },

  stopPlay: function () {
    AppDispatcher.dispatch({
      actionType: Constants.STOP_PLAY
    });
  },
  togglePlay: function () {
    AppDispatcher.dispatch({
      actionType: Constants.TOGGLE_PLAY
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

  addTrace: function () {
    AppDispatcher.dispatch({
      actionType: Constants.ADD_TRACE
    });
  },
  updateTrace: function (points) {
    AppDispatcher.dispatch({
      actionType: Constants.UPDATE_TRACE,
      points: points
    });
  },
  selectTrace: function (index) {
    AppDispatcher.dispatch({
      actionType: Constants.SELECT_TRACE,
      index: index
    });
  },
  saveTraces: function (userName) {
    WebAPIUtils.saveTraces(
      DataStore.getExperiment().id,
      userName,
      DataStore.getTraces()
    );
  }
};
