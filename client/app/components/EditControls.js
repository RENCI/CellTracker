var React = require("react");
var PropTypes = require("prop-types");
var IconButton = require("./IconButton");
var ViewActionCreators = require("../actions/ViewActionCreators");

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

function onRegionSelectClick() {
  ViewActionCreators.setEditMode("regionSelect");
}

function onZoomInClick() {
  ViewActionCreators.zoom("edit", "in");
}

function onZoomOutClick() {
  ViewActionCreators.zoom("edit", "out");
}

function EditControls(props) {
  return (
    <div className="form-inline">
      <div className="btn-group-sm mr-2">
        <IconButton 
          iconName="oi-pencil" callback={onVertexEditClick} active={props.editMode === "vertex"} tooltip="Vertex edit" />
        <IconButton 
          iconName="oi-fullscreen-exit" callback={onMergeClick} active={props.editMode === "merge"} tooltip="Merge regions" />
        <IconButton 
          iconName="oi-fullscreen-enter" callback={onSplitClick} active={props.editMode === "split"} tooltip="Split region" />
        <IconButton 
          iconName="oi-crop" callback={onTrimClick} active={props.editMode === "trim"} tooltip="Trim region" />
        <IconButton 
          iconName="oi-wrench" callback={onRegionEditClick} active={props.editMode === "regionEdit"} tooltip="Add/remove region" />
        <IconButton
          iconName="oi-map-marker" callback={onRegionSelectClick} active={props.editMode === "regionSelect"} tooltip="Center on region" />
      </div>
      <div className="btn-group-sm">
        <IconButton 
          iconName="oi-zoom-in" callback={onZoomInClick} tooltip="Zoom in" />
        <IconButton 
          iconName="oi-zoom-out" callback={onZoomOutClick} tooltip="Zoom out" />
      </div>
    </div>
  );
}

EditControls.propTypes = {
  editMode: PropTypes.string.isRequired
};

module.exports = EditControls;
