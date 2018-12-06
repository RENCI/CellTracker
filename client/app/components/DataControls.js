var React = require("react");
var PropTypes = require("prop-types");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onExperimentSelectChange(e) {
  ViewActionCreators.selectExperiment(e.target.value);
}

function DataControls(props) {
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
    </div>
  );
}

DataControls.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object
};

module.exports = DataControls;
