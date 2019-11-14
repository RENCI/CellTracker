import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import IconButton from "./IconButton";
import ButtonDivider from "./ButtonDivider";
import * as ViewActionCreators from "../actions/ViewActionCreators";

function onBackClick() {
  ViewActionCreators.reverseFrames();
}

function onForwardClick() {
  ViewActionCreators.advanceFrames();
}

function onStabilizeClick() {
  ViewActionCreators.toggleStabilize();
}

function onFramesToLoadChange(e) {
  ViewActionCreators.setFramesToLoad(+e.target.value);
}

function onFrameOverlapChange(e) {
  ViewActionCreators.setFrameOverlap(+e.target.value);
}


const DataControls = props => {
  const [loading, setLoading] = useState(props.loading);
  const [startFrame, setStartFrame] = useState("");

  useEffect(() => {
    if (props.experiment && props.experiment.start && props.loading !== loading) {
      if (props.loading) setStartFrame(props.experiment.start);
      setLoading(props.loading);
    }
  }, [props, loading]);

  const onExperimentSelectChange = (e) => {
    const index = props.experimentList.experiments.map(e => e.id).indexOf(e.target.value);

    ViewActionCreators.selectExperiment(props.experimentList.experiments[index]);
  }  

  const onStartFrameChange = (e) => {
    setStartFrame(+e.target.value);
  }

  const onLoadClick = () => {
    ViewActionCreators.loadFrames(startFrame);
  }

  const onSaveClick = () => {
    ViewActionCreators.saveSegmentationData(
      props.experiment.id,
      props.experiment.segmentationData
    );
  }

  const lockSymbol = "\uD83D\uDD12";
  const lockKeySymbol = "\uD83D\uDD10";
  const emSpace = "\u2003";

  let defaultOption = [
    <option key="-1" value="" disabled hidden>
      Select experiment
    </option>
  ];

  const currentOptions = props.experimentList.experiments.filter((experiment) => {
    return experiment.locked_by && experiment.locked_by === props.userInfo.username;
  }).map((experiment, i) => {
    return (
      <option 
        key={i}
        value={experiment.id}>
          {experiment.name} 
      </option>
    );
  });

  const availableOptions = props.experimentList.experiments.filter((experiment) => {
    return !experiment.locked_by;
  }).map((experiment, i) => {
    return (
      <option 
        key={i} 
        value={experiment.id}>
          {experiment.name} 
      </option>
    );
  });

  const lockedOptions = props.experimentList.experiments.filter((experiment) => {
    return experiment.locked_by && experiment.locked_by !== props.userInfo.username;
  }).map((experiment, i) => {
    return (
      <option 
        key={i} 
        value={experiment.id}>
          {experiment.name + " " + emSpace + " " + lockSymbol + " " + experiment.locked_by} 
      </option>
    );
  }); 

  const numOptions = currentOptions.length + availableOptions.length + lockedOptions.length;
  const experimentSelectEnabled = !props.experimentList.updating && numOptions > 0 && !props.loading && props.userInfo;
  const frameControlsEnabled = props.experiment && !props.loading;
  const saveEnabled = props.history && props.history.index > 0;

  const buttonClasses = "btn btn-primary";

  return (
    <div className="d-flex mb-3">
      <div className="flex-grow-1 flex-shrink-1 mr-2">
        <select
          id="experimentSelect"
          className="form-control"
          value={props.experiment ? props.experiment.id : ""}
          disabled={!experimentSelectEnabled}
          onChange={onExperimentSelectChange}>
            {defaultOption}
            {currentOptions.length === 0 ? null : 
              <optgroup label="Currently locked experiment" disabled={!props.userInfo}>
                {currentOptions}
              </optgroup>
            }
            {availableOptions.length === 0 ? null : 
              <optgroup label="Available experiments" disabled={!props.userInfo}>
                {availableOptions}
              </optgroup>
            }
            {lockedOptions.length === 0 ? null : 
              <optgroup label="Locked experiments" disabled={true}>
                {lockedOptions}
              </optgroup>
            }
        </select>
      </div>
      <div className="flex-grow-0 flex-shrink-0 mr-2">
        <div className="input-group">      
          <input 
            className="form-control" 
            type="number" 
            min={1} 
            max={props.experiment && props.experiment.totalFrames ? props.experiment.totalFrames : 999}
            value={startFrame}
            disabled={!frameControlsEnabled}
            onChange={onStartFrameChange} />
          <div className="input-group-append">
            <span className="input-group-text">
              {props.experiment && props.experiment.totalFrames ? "/ " + props.experiment.totalFrames : ""}
            </span>
          </div>
          <div className="input-group-append">
            <button 
              className={buttonClasses} 
              type="button" 
              disabled={!frameControlsEnabled}
              onClick={onLoadClick}>
                Load
            </button>
          </div>
        </div>
      </div>
      <div className="flex-grow-0 flex-shrink-0">
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
                disabled={!saveEnabled}
                classes={buttonClasses}
                callback={onSaveClick} />
          </div>
          <ButtonDivider />
          <div className="btn-group">
            <div className="dropdown">          
              <IconButton
                iconName="oi-menu"
                classes={buttonClasses}
                dropDown={true} />
              <div className="dropdown-menu">
                <div className="px-3 small">
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
                  <div className="form-group mt-3">
                    <label htmlFor="framesToLoadInput">Frames to load</label>
                    <input 
                      className="form-control form-control-sm" 
                      id="framesToLoadInput"
                      type="number" 
                      min={5} 
                      max={props.experiment && props.experiment.totalFrames ? props.experiment.totalFrames : 5}
                      value={props.settings.framesToLoad}
                      onChange={onFramesToLoadChange} />
                  </div>
                  <div className="form-group mt-3">
                    <label htmlFor="frameOverlapInput">Frame overlap</label>
                    <input 
                      className="form-control form-control-sm" 
                      id="frameOverlapInput"
                      type="number" 
                      min={0} 
                      max={Math.floor(props.settings.framesToLoad / 2)}
                      value={props.settings.frameOverlap}
                      onChange={onFrameOverlapChange} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

DataControls.propTypes = {
  experimentList: PropTypes.object.isRequired,
  experiment: PropTypes.object,
  settings: PropTypes.object,
  loading: PropTypes.object,
  history: PropTypes.object
};

export default DataControls;
