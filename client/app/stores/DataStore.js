var AppDispatcher = require("../dispatcher/AppDispatcher");
var EventEmitter = require("events").EventEmitter;
var assign = require("object-assign");
var Constants = require("../constants/Constants");

var CHANGE_EVENT = "change";

// List of available experiments
var experimentList = [];

// Active experiment
var experiment = null;

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
  }
});

DataStore.dispatchToken = AppDispatcher.register(function (action) {
  switch (action.actionType) {
    case Constants.RECEIVE_EXPERIMENT_LIST:
      experimentList = action.experimentList;
      DataStore.emitChange();
      break;

    case Constants.RECEIVE_EXPERIMENT:
      experiment = action.workspace;
      DataStore.emitChange();
      break;
  }
});

module.exports = DataStore;
