var AppDispatcher = require("../dispatcher/AppDispatcher");
var Constants = require("../constants/Constants");
var WebAPIUtils = require("../utils/WebAPIUtils");

module.exports = {
  getExperimentList: function () {
    WebAPIUtils.getExperimentList();
  },
  selectExperiment: function (id) {
    WebAPIUtils.getExperiment(id);
  },
  saveTrackingData: function (id, traces) {
    WebAPIUtils.saveTrackingData(id, traces);
  }
};
