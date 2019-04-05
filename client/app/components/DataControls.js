const React = require("react");
const PropTypes = require("prop-types");
const IconButton = require("./IconButton");
const ButtonDivider = require("./ButtonDivider");
const ViewActionCreators = require("../actions/ViewActionCreators");

function onBackClick() {
  ViewActionCreators.reverseFrames();
}

function onForwardClick() {
  ViewActionCreators.advanceFrames();
}

function onUndoClick() {
  ViewActionCreators.undoHistory();
}

function onRedoClick() {
  ViewActionCreators.redoHistory();
}

function onStabilizeClick() {
  ViewActionCreators.toggleStabilize();
}

function DataControls(props) {
  function onExperimentSelectChange(e) {
    const index = props.experimentList.map(e => e.id).indexOf(e.target.value);

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

  const experimentSelectEnabled = options.length > 1 && !props.loading;
  const frameControlsEnabled = props.experiment && !props.loading;
  const undoEnabled = props.history && props.history.index > 0;
  const redoEnabled = props.history && props.history.index < props.history.edits.length - 1;

  const buttonClasses = "btn btn-primary";

  return (
    <div className="form-row mb-3">
      <div className="col-7">
        <select
          id="experimentSelect"
          className="form-control"
          value={props.experiment ? props.experiment.id : ""}
          disabled={!experimentSelectEnabled}
          onChange={onExperimentSelectChange}>
            {options}
        </select>
      </div>
      <div className="col-5">
        <div className="btn-toolbar">
          <div className="btn-group mr-2">
            <IconButton
              iconName="oi-arrow-thick-left"
              disabled={!frameControlsEnabled}
              classes={buttonClasses}
              callback={onBackClick} />
            <IconButton
              iconName="oi-arrow-thick-right"
              disabled={!frameControlsEnabled}
              classes={buttonClasses}
              callback={onForwardClick} />
          </div>
          <ButtonDivider />
          <div className="btn-group mr-2">
            <IconButton
                iconName="oi-data-transfer-upload"
                disabled={!undoEnabled}
                classes={buttonClasses}
                callback={onSaveClick} />
          </div>
          <div className="btn-group mr-2">
            <IconButton
              iconName="oi-action-undo"
              disabled={!undoEnabled}
              classes={buttonClasses}
              callback={onUndoClick} />
            <IconButton
              iconName="oi-action-redo"
              disabled={!redoEnabled}
              classes={buttonClasses}
              callback={onRedoClick} />
          </div>
          <ButtonDivider />
          <div className="btn-group">
            <div className="dropdown">          
              <IconButton
                iconName="oi-menu"
                classes={buttonClasses}
                dropDown={true} />
              <div className="dropdown-menu">
                <form className="px-3" style={{fontSize: "small"}}>
                  <div className="form-check">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      id="stabilizeCheck" 
                      defaultChecked={props.settings.stabilize}
                      onClick={onStabilizeClick}/>
                    <label className="form-check-label" htmlFor="stabilizeCheck">
                      Stabilize playback
                    </label>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

DataControls.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object,
  settings: PropTypes.object,
  loading: PropTypes.object,
  history: PropTypes.object
};

module.exports = DataControls;
