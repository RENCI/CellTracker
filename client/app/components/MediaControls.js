import React from "react";
import PropTypes from "prop-types";
import IconButton from "./IconButton";
import * as ViewActionCreators from "../actions/ViewActionCreators";

function onLoopClick() {
  ViewActionCreators.cycleLoop();
}

function onSkipBackwardClick() {
  ViewActionCreators.skipBackward();
}

function onStepBackwardClick() {
  ViewActionCreators.frameDelta(-1);
}

function onPlayClick() {
  ViewActionCreators.togglePlay();
}

function onStepForwardClick() {
  ViewActionCreators.frameDelta(1);
}

function onSkipForwardClick() {
  ViewActionCreators.skipForward();
}

function onFrameRateChange(e) {
  ViewActionCreators.selectFrameRate(+e.target.value);
}

function onRangeChange(e) {
  ViewActionCreators.setFrame(+e.target.value);
}

const frameRateOptions = [0.25, 0.5, 1, 2, 4, 8, 16].map(function (frameRate, i) {
  return (
    <option key={i} value={frameRate}>
      {frameRate + "x"}
    </option>
  );
});

const rangeStyle = {
  marginLeft: 5
};

function MediaControls(props) {
  const playIcon = props.playback.play ? "oi-media-pause" : "oi-media-play";
  const loopIcon = props.playback.loop === "rock" ? "oi-resize-width" : "oi-loop";
  const looping = props.playback.loop === "loop" || props.playback.loop === "rock";

  const numFrames = props.experiment.frames;
  const frame = props.playback.frame;

  // Use maximum digits with 'em' as a conservative estimate of label length
  const maxDigits = ("" + numFrames).length * 2 + 1;

  return (
    <div className="input-group input-group-sm">
      <div className="input-group-prepend">
        <IconButton iconName={loopIcon} callback={onLoopClick} active={looping} />
        <IconButton iconName="oi-media-skip-backward" callback={onSkipBackwardClick} />
        <IconButton iconName="oi-media-step-backward" callback={onStepBackwardClick} />
        <IconButton iconName={playIcon} callback={onPlayClick} />
        <IconButton iconName="oi-media-step-forward" callback={onStepForwardClick} />
        <IconButton iconName="oi-media-skip-forward" callback={onSkipForwardClick} />
        <select
          value={props.playback.frameRate}
          onChange={onFrameRateChange}>
            {frameRateOptions}
        </select>
      </div>
      <input
        className="form-control form-control-range custom-range"
        type="range"
        min={0}
        max={numFrames - 1}
        value={frame}
        onChange={onRangeChange} />
      <div className="input-group-append">
        <span className="input-group-text" style={{width: maxDigits + "em"}}>
          {(frame + 1) + "/" + numFrames}
        </span>
      </div>
    </div>
  );
}

MediaControls.propTypes = {
  experiment: PropTypes.object.isRequired,
  playback: PropTypes.object.isRequired
};

export default MediaControls;
