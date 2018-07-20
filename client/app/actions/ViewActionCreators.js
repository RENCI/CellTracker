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

  updateLoading: function (frame, numFrames) {
    AppDispatcher.dispatch({
      actionType: Constants.UPDATE_LOADING,
      frame: frame,
      numFrames: numFrames
    });
  },

  stopPlay: function() {
    AppDispatcher.dispatch({
      actionType: Constants.STOP_PLAY
    });
  },
  togglePlay: function() {
    AppDispatcher.dispatch({
      actionType: Constants.TOGGLE_PLAY
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
  saveTraces: function () {
    WebAPIUtils.saveTraces(
      DataStore.getExperiment().id,
      DataStore.getTraces()
    );
  }
};
