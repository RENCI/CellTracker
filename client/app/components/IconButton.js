import React from "react";
import PropTypes from "prop-types";

const IconButton = props => {
  let classes = props.classes;
  if (props.active) classes += " active";
  if (props.dropDown) classes += " dropdown-toggle";
  classes = classes.trim();

  let dataToggle = "";
  if (props.tooltip) dataToggle += " tooltip";
  if (props.dropDown) dataToggle += " dropdown";  
  dataToggle = dataToggle.trim();

  return (
    <button
      type="button"      
      className={classes}
      disabled={props.disabled}
      data-toggle={dataToggle.length > 0 ? dataToggle : null}
      title={props.tooltip ? props.tooltip : null}
      onClick={props.callback ? props.callback : null}>
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
  dropDown: PropTypes.bool,
  callback: PropTypes.func
};

IconButton.defaultProps = {
  classes: "btn btn-outline-secondary",
  disabled: false,
  active: false,
  dropDown: false
};

export default IconButton;
