var React = require("react");
var PropTypes = require("prop-types");

function IconButton(props) {
  let classes = props.classes;
  if (props.active) classes += " active";

  return (
    <button
      type="button"
      className={classes}
      disabled={props.disabled}
      data-toggle={props.tooltip ? "tooltip" : null}
      title={props.tooltip ? props.tooltip : null}
      onClick={props.callback}>
        <span className={"oi " + props.iconName}></span>
    </button>
  );
}

IconButton.propTypes = {
  iconName: PropTypes.string.isRequired,
  classes: PropTypes.string,
  disabled: PropTypes.bool,
  active: PropTypes.bool,
  tooltip: PropTypes.string,
  callback: PropTypes.func.isRequired
};

IconButton.defaultProps = {
  classes: "btn btn-outline-secondary",
  disabled: false,
  active: false
};

module.exports = IconButton;
