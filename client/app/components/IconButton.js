var React = require("react");
var PropTypes = require("prop-types");

function IconButton(props) {
  var classes = "btn btn-outline-secondary";
  if (props.active) classes += " active";

  return (
    <button
      type="button"
      className={classes}
      onClick={props.callback}>
        <span className={"oi " + props.iconName}></span>
    </button>
  );
}

IconButton.propTypes = {
  iconName: PropTypes.string.isRequired,
  callback: PropTypes.func.isRequired,
  active: PropTypes.bool
};

IconButton.defaultProps = {
  active: false
};

module.exports = IconButton;
