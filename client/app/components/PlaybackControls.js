import React from "react";
import IconButton from "./IconButton";
import * as ViewActionCreators from "../actions/ViewActionCreators";

function button(iconName, callback, active) {
  const classes = "btn btn-outline-secondary";
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
        <IconButton iconName="oi-zoom-in" callback={onZoomInClick} tooltip="Zoom in" />
        <IconButton iconName="oi-zoom-out" callback={onZoomOutClick} tooltip="Zoom out" />
      </div>
    </div>
  );
}

export default PlaybackControls;
