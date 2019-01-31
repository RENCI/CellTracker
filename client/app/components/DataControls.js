var React = require("react");
var PropTypes = require("prop-types");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onExperimentSelectChange(e) {
  ViewActionCreators.selectExperiment(e.target.value);
}

function DataControls(props) {
  function onSaveClick() {
    ViewActionCreators.saveSegmentationData(
      props.experiment.id,
      props.experiment.segmentationData
    );
  }

  let options = [
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

  let changesMade = props.experiment && props.experiment.segmentationData.reduce(function (p, c) {
    return p || c.edited;
  }, false);

  return (
    <div className="form-row mb-3">
      <div className="col-10">
        <select
          id="experimentSelect"
          className="form-control"
          value={props.experiment ? props.experiment.id : ""}
          disabled={options.length <= 1}
          onChange={onExperimentSelectChange}>
            {options}
        </select>
      </div>
      <div className="col-2">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!changesMade}
          onClick={onSaveClick}>
            Save
        </button>
      </div>
    </div>
  );
}

DataControls.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object
};

module.exports = DataControls;
