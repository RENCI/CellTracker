var AppDispatcher = require("../dispatcher/AppDispatcher");
var Constants = require("../constants/Constants");

module.exports = {
  receiveExperimentList: function (experimentList) {
    AppDispatcher.dispatch({
      actionType: Constants.RECEIVE_EXPERIMENT_LIST,
      experimentList: experimentList
    });
  },
  receiveExperiment: function (experiment) {
    AppDispatcher.dispatch({
      actionType: Constants.RECEIVE_EXPERIMENT,
      experiment: experiment
    });
  },
  receiveFrame: function (frame, image) {
    AppDispatcher.dispatch({
      actionType: Constants.RECEIVE_FRAME,
      frame: frame,
      image: image
    });
  },
  receiveSegmentationFrame: function (frame, segmentation) {
    AppDispatcher.dispatch({
      actionType: Constants.RECEIVE_SEGMENTATION_FRAME,
      frame: frame,
      segmentation: segmentation
    });
  }
};
