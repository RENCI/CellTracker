var React = require("react");
var PropTypes = require("prop-types");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onStopClick() {
  ViewActionCreators.stopPlay();
}

function onPlayClick() {
  ViewActionCreators.togglePlay();
}

function onRangeChange(e) {
  ViewActionCreators.updateFrame(+e.target.value);
}

var rangeStyle = {
  marginLeft: 5
};

function button(icon, callback) {
  return (
    <button
      type="button"
      className="btn btn-default"
      onClick={callback}>
        <span className={"glyphicon " + icon}></span>
    </button>
  );
}

function MediaControls(props) {
  var playIcon = props.play ? "glyphicon-pause" : "glyphicon-play";

  return (
    <div className="input-group input-group-sm">
      <div className="input-group-btn">
        {button("glyphicon-stop", onStopClick)}
        {button(playIcon, onPlayClick)}
      </div>
      <input
        className="form-control"
        type="range"
        min={0}
        max={props.experiment.frames - 1}
        value={props.frame}
        style={rangeStyle}
        onChange={onRangeChange} />
    </div>
  );
}

MediaControls.propTypes = {
  experiment: PropTypes.object.isRequired,
  play: PropTypes.bool.isRequired,
  frame: PropTypes.number.isRequired
};

module.exports = MediaControls;