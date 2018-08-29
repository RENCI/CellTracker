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
  receiveSegmentationData: function (data) {
    AppDispatcher.dispatch({
      actionType: Constants.RECEIVE_SEGMENTATION_DATA,
      data: data
    });
  }
};
