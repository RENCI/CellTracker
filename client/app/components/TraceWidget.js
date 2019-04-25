import  React from "react";
import  PropTypes from "prop-types";
import  ViewActionCreators from "../actions/ViewActionCreators";

const TraceWidget = props => {
  const classes = "btn btn-outline-secondary btn-sm btn-block";
  if (props.trace.active) classes += " active";

  return (
    <button
      type="button"
      className={classes}
      onClick={props.onClick}>
        {props.trace.name}
    </button>
  );
}

TraceWidget.propTypes = {
  trace: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired
};

export default TraceWidget;
