var React = require("react");
var PropTypes = require("prop-types");
var IconButton = require("./IconButton");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onBackClick() {
//  ViewActionCreators.undoHistory();
console.log("back");
}

function onForwardClick() {
//  ViewActionCreators.redoHistory();
console.log("forward");
}

function onUndoClick() {
  ViewActionCreators.undoHistory();
}

function onRedoClick() {
  ViewActionCreators.redoHistory();
}

function DataControls(props) {
  function onExperimentSelectChange(e) {
    let index = props.experimentList.map(e => e.id).indexOf(e.target.value);

    ViewActionCreators.selectExperiment(props.experimentList[index]);
  }

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

  let undoEnabled = props.history && props.history.index > 0;
  let redoEnabled = props.history && props.history.index < props.history.edits.length - 1;

  return (
    <div className="form-row mb-3">
      <div className="col-8">
        <select
          id="experimentSelect"
          className="form-control"
          value={props.experiment ? props.experiment.id : ""}
          disabled={options.length <= 1}
          onChange={onExperimentSelectChange}>
            {options}
        </select>
      </div>
      <div className="col-4">
        <div className="btn-toolbar">
          <div className="btn-group mr-2">
            <IconButton
              iconName="oi-arrow-thick-left"
              disabled={!props.experiment}
              classes="btn btn-primary"
              callback={onBackClick} />
            <IconButton
              iconName="oi-arrow-thick-right"
              disabled={!props.experiment}
              classes="btn btn-primary"
              callback={onForwardClick} />
          </div>
          <div className="mr-2" style={{
              height: "auto",
              width: "2px",
              borderRadius: "1px",
              backgroundColor: "#d0d4da"
            }}>
          </div>
          <div className="btn-group mr-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!changesMade}
              onClick={onSaveClick}>
                Save
            </button>
          </div>
          <div className="btn-group">
            <IconButton
              iconName="oi-action-undo"
              disabled={!undoEnabled}
              classes="btn btn-primary"
              callback={onUndoClick} />
            <IconButton
              iconName="oi-action-redo"
              disabled={!redoEnabled}
              classes="btn btn-primary"
              callback={onRedoClick} />
          </div>
        </div>
      </div>
    </div>
  );
}

DataControls.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object,
  history: PropTypes.object
};

module.exports = DataControls;
