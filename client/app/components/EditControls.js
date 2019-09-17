import React, { useRef } from "react";
import PropTypes from "prop-types" ;
import IconButton from "./IconButton" ;
import * as ViewActionCreators from "../actions/ViewActionCreators";
import useTooltip from "../hooks/useTooltip";

function onVertexEditClick() {
  ViewActionCreators.setEditMode("vertex");
}

function onMergeClick() {
  ViewActionCreators.setEditMode("merge");
}

function onSplitClick() {
  ViewActionCreators.setEditMode("split");
}

function onTrimClick() {
  ViewActionCreators.setEditMode("trim");
}

function onRegionEditClick() {
  ViewActionCreators.setEditMode("regionEdit");
}

function onRegionMoveClick() {
  ViewActionCreators.setEditMode("regionMove");
}

function onRegionRotateClick() {
  ViewActionCreators.setEditMode("regionRotate");
}

function onRegionCopy() {
  ViewActionCreators.setEditMode("regionCopy");
}

function onRegionPaste() {
  ViewActionCreators.setEditMode("regionPaste");
}

function onRegionSelectClick() {
  ViewActionCreators.setEditMode("regionSelect");
}

function onZoomInClick() {
  ViewActionCreators.zoom("edit", "in");
}

function onZoomOutClick() {
  ViewActionCreators.zoom("edit", "out");
}

function onResetClick() {
  ViewActionCreators.selectRegion(-1, null);
}

const EditControls = props => {
  const ref = useRef(null);
  useTooltip(ref); 

  const spacing = " ml-3";

  return (
    <div className="form-inline justify-content-center" ref={ref}>
      <div className="btn-group-sm">
        <IconButton 
          iconName="oi-home" callback={onResetClick} tooltip="Reset" />
        <IconButton 
          iconName="oi-zoom-in" callback={onZoomInClick} tooltip="Zoom in" />
        <IconButton 
          iconName="oi-zoom-out" callback={onZoomOutClick} tooltip="Zoom out" />
        <IconButton
          iconName="oi-map-marker" callback={onRegionSelectClick} active={props.editMode === "regionSelect"} tooltip="Center view" />
      </div>
      <div className={"btn-group-sm" + spacing}>        
        <IconButton 
          iconName="oi-wrench" callback={onRegionEditClick} active={props.editMode === "regionEdit"} tooltip="Add/remove region" />
        <IconButton 
          iconName="oi-fullscreen-enter" callback={onSplitClick} active={props.editMode === "split"} tooltip="Split region" />
        <IconButton 
          iconName="oi-fullscreen-exit" callback={onMergeClick} active={props.editMode === "merge"} tooltip="Merge regions" />
        <IconButton 
          iconName="oi-tag" callback={onRegionCopy} active={props.editMode === "regionCopy"} tooltip="Copy region" />
        <IconButton 
          iconName="oi-tags" callback={onRegionPaste} active={props.editMode === "regionPaste"} tooltip="Paste region" /> 
      </div>
      <div className={"btn-group-sm" + spacing}>
        <IconButton 
          iconName="oi-pencil" callback={onVertexEditClick} active={props.editMode === "vertex"} tooltip="Vertex edit" />
        <IconButton 
          iconName="oi-move" callback={onRegionMoveClick} active={props.editMode === "regionMove"} tooltip="Move region" />
        <IconButton 
          iconName="oi-loop-circular" callback={onRegionRotateClick} active={props.editMode === "regionRotate"} tooltip="Rotate region" />   
        <IconButton 
          iconName="oi-crop" callback={onTrimClick} active={props.editMode === "trim"} tooltip="Trim region" />
      </div>
    </div>
  );
}

EditControls.propTypes = {
  editMode: PropTypes.string.isRequired
};

export default EditControls;
