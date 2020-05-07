import React, { useRef } from "react";
import PropTypes from "prop-types" ;
import IconButton from "./IconButton";
import LabelButton from "./LabelButton";
import * as ViewActionCreators from "../actions/ViewActionCreators";
import useTooltip from "../hooks/useTooltip";

function onVertexEditClick() {
  ViewActionCreators.setEditMode("vertex");
}

function onMergeClick() {
  ViewActionCreators.setEditMode("regionMerge");
}

function onSplitClick() {
  ViewActionCreators.setEditMode("regionSplit");
}

function onTrimClick() {
  ViewActionCreators.setEditMode("regionTrim");
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

function onRegionLinkClick() {
  ViewActionCreators.setEditMode("regionLink");
}

function onRegionBreakLinkClick() {
  ViewActionCreators.setEditMode("regionBreakLink");
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

function onUndoClick() {
  ViewActionCreators.undoHistory();
}

function onRedoClick() {
  ViewActionCreators.redoHistory();
}

function onLabelClick() {
  ViewActionCreators.setEditMode("regionLabel");
}

function onLabelChange(label) {
  ViewActionCreators.setCurrentLabel(label);
}

const EditControls = props => {
  const ref = useRef(null);
  useTooltip(ref); 

  const spacing = " ml-3";

  const undoEnabled = props.history && props.history.index > 0;
  const redoEnabled = props.history && props.history.index < props.history.edits.length - 1;

  return (
    <div className="form-inline justify-content-center" ref={ref}>
      <div className="btn-group-sm">
        <IconButton 
          iconName="oi-home" callback={onResetClick} tooltip="Reset" shortcut="Esc" />
        <IconButton 
          iconName="oi-zoom-in" callback={onZoomInClick} tooltip="Zoom in" shortcut="+/=" />
        <IconButton 
          iconName="oi-zoom-out" callback={onZoomOutClick} tooltip="Zoom out" shortcut="-" />
        <IconButton
          iconName="oi-map-marker" callback={onRegionSelectClick} active={props.editMode === "regionSelect"} tooltip="Center view" shortcut="c"/>
      </div>
      <div className={"btn-group-sm" + spacing}>        
        <IconButton 
          iconName="oi-wrench" callback={onRegionEditClick} active={props.editMode === "regionEdit"} tooltip="Add/remove region" shortcut="a" />
        <IconButton 
          iconName="oi-fullscreen-enter" callback={onSplitClick} active={props.editMode === "regionSplit"} tooltip="Split region" shortcut="s" />
        <IconButton 
          iconName="oi-fullscreen-exit" callback={onMergeClick} active={props.editMode === "regionMerge"} tooltip="Merge regions" shortcut="d" />
        <IconButton 
          iconName="oi-tag" callback={onRegionCopy} active={props.editMode === "regionCopy"} tooltip="Copy region" shortcut="q" />
        <IconButton 
          iconName="oi-tags" callback={onRegionPaste} active={props.editMode === "regionPaste"} tooltip="Paste region" shortcut="p" /> 
      </div>
      <div className={"btn-group-sm" + spacing}>
        <IconButton 
          iconName="oi-pencil" callback={onVertexEditClick} active={props.editMode === "vertex"} tooltip="Vertex edit" shortcut="e" />
        <IconButton 
          iconName="oi-move" callback={onRegionMoveClick} active={props.editMode === "regionMove"} tooltip="Move region" shortcut="t" />
        <IconButton 
          iconName="oi-loop-circular" callback={onRegionRotateClick} active={props.editMode === "regionRotate"} tooltip="Rotate region" shortcut="r" />   
        <IconButton 
          iconName="oi-crop" callback={onTrimClick} active={props.editMode === "regionTrim"} tooltip="Trim region" shortcut="w" />
      </div>
      <div className={"btn-group-sm" + spacing}>
        <IconButton 
          iconName="oi-link-intact" callback={onRegionLinkClick} active={props.editMode === "regionLink"} tooltip="Link regions" shortcut="f" />
        <IconButton 
          iconName="oi-link-broken" callback={onRegionBreakLinkClick} active={props.editMode === "regionBreakLink"} tooltip="Break region links" shortcut="g" />
      </div>      
      <div className={"btn-group-sm" + spacing}>
        <IconButton 
          iconName="oi-action-undo" callback={onUndoClick} disabled={!undoEnabled} tooltip="Undo" shortcut="Ctrl-z" />
        <IconButton
          iconName="oi-action-redo" callback={onRedoClick} disabled={!redoEnabled} tooltip="Redo" shortcut="Ctrl-y" />
      </div>
      <div className={spacing}>
        <LabelButton onClick={onLabelClick} onChange={onLabelChange} active={props.editMode === "regionLabel"} tooltip="Toggle label" shortcut="l" options={props.labels} value={props.currentLabel} />
      </div>
    </div>
  );
}

EditControls.propTypes = {
  editMode: PropTypes.string.isRequired,
  history: PropTypes.object,
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  currentLabel: PropTypes.string.isRequired
};

export default EditControls;
