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

  saveSegmentationData: function (id, segmentationData) {
    WebAPIUtils.saveSegmentationData(id, segmentationData);
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

  selectRegion: function (frame, region) {
    AppDispatcher.dispatch({
      actionType: Constants.SELECT_REGION,
      frame: frame,
      region: region
    });
  },

  zoom: function (view, direction) {
    AppDispatcher.dispatch({
      actionType: Constants.ZOOM,
      view: view,
      direction: direction
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
      DataStore.getTraces()
    );
  }
};
