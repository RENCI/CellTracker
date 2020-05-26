import React from "react";
import PropTypes from "prop-types";
import IconButton from "./IconButton";
import * as ViewActionCreators from "../actions/ViewActionCreators";

function onShowFramesChange(e) {
  ViewActionCreators.setShowFrames(e.target.checked);
}

function onStabilizeChange(e) {
  ViewActionCreators.setStabilize(e.target.checked);
}

function onFramesToLoadChange(e) {
  ViewActionCreators.setFramesToLoad(e.target.value);
}

function onFrameExpansionChange(e) {
  ViewActionCreators.setFrameExpansion(e.target.value);
}

function onDoneOpacityChange(e) {
  ViewActionCreators.setDoneOpacity(e.target.value);
}

const UserSettings = props => {
  const cancelEvent = e => {   
    e.stopPropagation(); 
  };

  const buttonClasses = "btn btn-primary";

  return (
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
                id="showFramesCheck" 
                checked={props.settings.showFrames}
                onChange={onShowFramesChange}/>
              <label className="form-check-label" htmlFor="showFramesCheck">
                Show frames
              </label>
            </div>
            <div className="form-check">
              <input 
                type="checkbox" 
                className="form-check-input" 
                id="stabilizeCheck" 
                checked={props.settings.stabilize}
                onChange={onStabilizeChange}/>
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
                onChange={onFramesToLoadChange}
                onKeyUp={cancelEvent} />
            </div>
            <div className="form-group mt-3">
              <label htmlFor="frameExpansionInput">Frame expansion</label>
              <input 
                className="form-control form-control-sm" 
                id="frameExpansionInput"
                type="number" 
                min={0} 
                max={props.experiment && props.experiment.totalFrames ? props.experiment.totalFrames : 5}
                value={props.settings.frameExpansion}
                onChange={onFrameExpansionChange}
                onKeyUp={cancelEvent} />
            </div>
            <div className="form-group mt-3">
              <label htmlFor="doneOpacityInput">Done opacity</label>
              <input 
                className="form-control form-control-sm" 
                id="doneOpacityInput"
                type="number" 
                min={0} 
                max={1}
                step={0.1}
                value={props.settings.doneOpacity}
                onChange={onDoneOpacityChange}
                onKeyUp={cancelEvent} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

UserSettings.propTypes = {
  experiment: PropTypes.object,
  settings: PropTypes.object
};

export default UserSettings;
