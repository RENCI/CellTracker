var AppDispatcher = require("../dispatcher/AppDispatcher");
var Constants = require("../constants/Constants");
var WebAPIUtils = require("../utils/WebAPIUtils");
var DataStore = require("../stores/DataStore");

module.exports = {
  getExperimentList: function () {
    WebAPIUtils.getExperimentList();
  },
  selectExperiment: function (id) {
    WebAPIUtils.getExperiment(id);
  },
  storeTrackingData: function (data) {
    AppDispatcher.dispatch({
      actionType: Constants.STORE_TRACKING_DATA,
      data: data
    });
  },
  saveTrackingData: function () {
    WebAPIUtils.saveTrackingData(DataStore.getTrackingData());
  }
};
