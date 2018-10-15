var React = require("react");
var PropTypes = require("prop-types");
var TraceList = require("./TraceList");
var SaveTracesContainer = require("../containers/SaveTracesContainer");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onExperimentSelectChange(e) {
  ViewActionCreators.selectExperiment(e.target.value);
}

function Controls(props) {
  var options = [
    <option key="-1" value="" disabled hidden>
      Select experiment
    </option>
  ];

  options = options.concat(props.experimentList.map(function (experiment, i) {
    return (
      <option key={i} value={experiment.id}>
        {experiment.name}
      </option>
    );
  }));

  return (
    <div>
      <div className="form-group">
        <label htmlFor="experimentSelect">Experiment</label>
        <select
          id="experimentSelect"
          className="form-control"
          value={props.experiment ? props.experiment.id : ""}
          disabled={options.length <= 1}
          onChange={onExperimentSelectChange}>
            {options}
        </select>
      </div>
      <TraceList traces={props.traces} />
      <SaveTracesContainer />
    </div>
  );
}

Controls.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object,
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

module.exports = Controls;
