var React = require("react");
var PropTypes = require("prop-types");
var ViewActionCreators = require("../actions/ViewActionCreators");

function button(iconName, callback, active) {
  var classes = "btn btn-outline-secondary btn-sm";
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

function onVertexEditClick() {

}

function onRegionEditClick() {

}

function onMergeClick() {

}

function onSplitClick() {

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
      <div className="btn-group mr-2">
        {button("oi-pencil", onVertexEditClick, props.editMode === "vertex")}
        {button("oi-wrench", onRegionEditClick, props.editMode === "region")}
        {button("oi-fullscreen-exit", onMergeClick, props.editMode === "merge")}
        {button("oi-fullscreen-enter", onSplitClick, props.editMode === "split")}
      </div>
      <div className="btn-group">
        {button("oi-zoom-in", onZoomInClick)}
        {button("oi-zoom-out", onZoomOutClick)}
      </div>
    </div>
  );
}

EditControls.propTypes = {
  editMode: PropTypes.string.isRequired
};

module.exports = EditControls;
