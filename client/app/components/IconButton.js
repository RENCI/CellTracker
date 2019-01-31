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
  callback: PropTypes.func.isRequired
};

IconButton.defaultProps = {
  disabled: false,
  active: false,
  classes: "btn btn-outline-secondary"
};

module.exports = IconButton;
