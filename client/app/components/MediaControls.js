var React = require("react");
var PropTypes = require("prop-types");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onStopClick() {
  ViewActionCreators.stopPlay();
}

function onPlayClick() {
  ViewActionCreators.togglePlay();
}

function onStepBackwardClick() {
  ViewActionCreators.frameDelta(-1);
}

function onStepForwardClick() {
  ViewActionCreators.frameDelta(1);
}

function onFastForwardClick() {
  ViewActionCreators.fastForward();
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

function button(iconName, callback) {
  return (
    <button
      type="button"
      className="btn btn-outline-secondary"
      onClick={callback}>
        <span className={"oi " + iconName}></span>
    </button>
  );
}

function MediaControls(props) {
  var playIcon = props.play ? "oi-media-pause" : "oi-media-play";

  // Use maximum digits with 'em' as a conservative estimate of label length
  var maxDigits = ("" + props.experiment.frames).length * 2 + 1;

  return (
    <div className="input-group input-group-sm">
      <div className="input-group-prepend">
        {button(playIcon, onPlayClick)}
        {button("oi-media-stop", onStopClick)}
        {button("oi-media-step-backward", onStepBackwardClick)}
        {button("oi-media-step-forward", onStepForwardClick)}
        {button("oi-media-skip-forward", onFastForwardClick)}
        <select
          value={props.frameRate}
          onChange={onFrameRateChange}>
            {frameRateOptions}
        </select>
      </div>
      <input
        className="form-control form-control-range custom-range"
        type="range"
        min={0}
        max={props.experiment.frames - 1}
        value={props.frame}
        onChange={onRangeChange} />
      <div className="input-group-append">
        <span className="input-group-text" style={{width: maxDigits + "em"}}>
          {(props.frame + 1) + "/" + props.experiment.frames}
        </span>
      </div>
    </div>
  );
}

MediaControls.propTypes = {
  experiment: PropTypes.object.isRequired,
  play: PropTypes.bool.isRequired,
  frame: PropTypes.number.isRequired,
  frameRate: PropTypes.number.isRequired
};

module.exports = MediaControls;
