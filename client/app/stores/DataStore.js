var AppDispatcher = require("../dispatcher/AppDispatcher");
var EventEmitter = require("events").EventEmitter;
var assign = require("object-assign");
var Constants = require("../constants/Constants");

var CHANGE_EVENT = "change";

// List of available experiments
var experimentList = [];

// Active experiment
var experiment = null;

// Traces for this experiment
var traces = [];
var activeTrace = null;

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
  getTraces: function () {
    return traces;
  }
});

DataStore.dispatchToken = AppDispatcher.register(function (action) {
  switch (action.actionType) {
    case Constants.RECEIVE_EXPERIMENT_LIST:
      experimentList = action.experimentList;
      DataStore.emitChange();
      break;

    case Constants.RECEIVE_EXPERIMENT:
      experiment = action.experiment;
      resetTraces();
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
