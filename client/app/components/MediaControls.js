var React = require("react");
var PropTypes = require("prop-types");
var ViewActionCreators = require("../actions/ViewActionCreators");

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

var frameRateOptions = [0.25, 0.5, 1, 2, 4, 8, 16].map(function (frameRate, i) {
  return (
    <option key={i} value={frameRate}>
      {frameRate + "x"}
    </option>
  );
});

var rangeStyle = {
  marginLeft: 5
};

function button(iconName, callback, active) {
  var classes = "btn btn-outline-secondary";
  if (active) classes += " active";

  return (
    <button
      type="button"
      className={classes}
      onClick={callback}>
        <span className={"oi " + iconName}></span>
    </button>
  );
}

function MediaControls(props) {
  var playIcon = props.playback.play ? "oi-media-pause" : "oi-media-play";
  var loopIcon = props.playback.loop === "rock" ? "oi-resize-width" : "oi-loop";
  var looping = props.playback.loop === "loop" || props.playback.loop === "rock";

  var numFrames = props.experiment.frames;
  var frame = props.playback.frame;

  // Use maximum digits with 'em' as a conservative estimate of label length
  var maxDigits = ("" + numFrames).length * 2 + 1;

  return (
    <div className="input-group input-group-sm">
      <div className="input-group-prepend">
        {button(loopIcon, onLoopClick, looping)}
        {button("oi-media-skip-backward", onSkipBackwardClick)}
        {button("oi-media-step-backward", onStepBackwardClick)}
        {button(playIcon, onPlayClick)}
        {button("oi-media-step-forward", onStepForwardClick)}
        {button("oi-media-skip-forward", onSkipForwardClick)}
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

module.exports = MediaControls;
