var React = require("react");
var PropTypes = require("prop-types");
var ViewActionCreators = require("../actions/ViewActionCreators");

function TraceWidget(props) {
  var classes = "btn btn-outline-secondary btn-sm btn-block";

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

module.exports = TraceWidget;
