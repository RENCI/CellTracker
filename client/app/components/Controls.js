var React = require("react");
var PropTypes = require("prop-types");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onExperimentSelectChange(e) {
  ViewActionCreators.selectExperiment(e.target.value);
}

function onSaveTrackingDataClick(e) {
  console.log("Save tracking data...");
}

function Controls(props) {
  var options = props.experimentList.map(function (experiment, i) {
    return (
      <option key={i} value={experiment.id}>
          {experiment.name}
      </option>
    );
  });

  options.push(<option key={1} value="test">Test</option>);

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
      <div className="form-group">
        <button
          className="btn btn-default btn-block"
          onClick={onSaveTrackingDataClick}>
            Save Tracking Data
        </button>
      </div>
    </div>
  );
}

Controls.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object.isRequired
};

module.exports = Controls;
