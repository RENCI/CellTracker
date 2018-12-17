var React = require("react");
var PropTypes = require("prop-types");
var IconButton = require("./IconButton");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onVertexEditClick() {
  ViewActionCreators.setEditMode("vertex");
}

function onRegionEditClick() {
  ViewActionCreators.setEditMode("region");
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
        <IconButton iconName="oi-pencil" callback={onVertexEditClick} active={props.editMode === "vertex"} />
        <IconButton iconName="oi-wrench" callback={onRegionEditClick} active={props.editMode === "region"} />
        <IconButton iconName="oi-fullscreen-exit" callback={onMergeClick} active={props.editMode === "merge"} />
        <IconButton iconName="oi-fullscreen-enter" callback={onSplitClick} active={props.editMode === "split"} />
        <IconButton iconName="oi-crop" callback={onTrimClick} active={props.editMode === "trim"} />
      </div>
      <div className="btn-group-sm">
        <IconButton iconName="oi-zoom-in" callback={onZoomInClick} />
        <IconButton iconName="oi-zoom-out" callback={onZoomOutClick} />
      </div>
    </div>
  );
}

EditControls.propTypes = {
  editMode: PropTypes.string.isRequired
};

module.exports = EditControls;
