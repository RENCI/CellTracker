import React, { useRef } from "react";
import PropTypes from "prop-types" ;
import IconButton from "./IconButton" ;
import * as ViewActionCreators from "../actions/ViewActionCreators";
import useTooltip from "../hooks/useTooltip";

function onZoomInClick() {
  ViewActionCreators.zoom("filmstrip", "in");
}

function onZoomOutClick() {
  ViewActionCreators.zoom("filmstrip", "out");
}

const FilmstripControls = props => {
  const ref = useRef(null);
  useTooltip(ref); 

  return (
    <div className="form-inline" ref={ref}>
      <div className="btn-group-sm ml-2">       
        <IconButton 
          iconName="oi-zoom-in" callback={onZoomInClick} tooltip="Zoom in" />
        <IconButton 
          iconName="oi-zoom-out" callback={onZoomOutClick} tooltip="Zoom out" />
      </div>
    </div>
  );
}

export default FilmstripControls;
