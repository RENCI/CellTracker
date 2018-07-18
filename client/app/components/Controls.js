var React = require("react");
var PropTypes = require("prop-types");
var TraceList = require("./TraceList");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onExperimentSelectChange(e) {
  ViewActionCreators.selectExperiment(e.target.value);
}

function onSaveTracesClick() {
  ViewActionCreators.saveTraces();
}

function Controls(props) {
  var options = props.experimentList.map(function (experiment, i) {
    return (
      <option key={i} value={experiment.id}>
        {experiment.name}
      </option>
    );
  });

  return (
    <div>
      <div className="form-group">
        <label htmlFor="experimentSelect">Experiment</label>
        <select
          id="experimentSelect"
          className="form-control"
          value={props.experiment.id}
          onChange={onExperimentSelectChange}>
            {options}
        </select>
      </div>
      <TraceList traces={props.traces} />
      <div className="form-group">
        <button
          type="button"
          className="btn btn-default btn-block"
          onClick={onSaveTracesClick}>
            Save Traces
        </button>
      </div>
    </div>
  );
}

Controls.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object.isRequired,
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

module.exports = Controls;
