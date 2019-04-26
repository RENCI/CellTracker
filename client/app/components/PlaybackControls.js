import React, { useRef } from "react";
import IconButton from "./IconButton";
import * as ViewActionCreators from "../actions/ViewActionCreators";
import useTooltip from "../hooks/useTooltip";

function onZoomInClick() {
  ViewActionCreators.zoom("playback", "in");
}

function onZoomOutClick() {
  ViewActionCreators.zoom("playback", "out");
}

function PlaybackControls() {
  const ref = useRef(null);
  useTooltip(ref); 

  return (
    <div className="form-inline" ref={ref}>
      <div className="btn-group-sm">
        <IconButton iconName="oi-zoom-in" callback={onZoomInClick} tooltip="Zoom in" />
        <IconButton iconName="oi-zoom-out" callback={onZoomOutClick} tooltip="Zoom out" />
      </div>
    </div>
  );
}

export default PlaybackControls;
