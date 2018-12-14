var React = require("react");
var IconButton = require("./IconButton");
var ViewActionCreators = require("../actions/ViewActionCreators");

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

function onZoomInClick() {
  ViewActionCreators.zoom("playback", "in");
}

function onZoomOutClick() {
  ViewActionCreators.zoom("playback", "out");
}

function PlaybackControls() {
  return (
    <div className="form-inline">
      <div className="btn-group-sm">
        <IconButton iconName="oi-zoom-in" callback={onZoomInClick} />
        <IconButton iconName="oi-zoom-out" callback={onZoomOutClick} />
      </div>
    </div>
  );
}

module.exports = PlaybackControls;
