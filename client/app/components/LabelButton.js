import React, { useState } from "react";
import PropTypes from "prop-types";

const LabelButton = props => {
  const label = d => {
    const i = props.options.indexOf(d);

    return i >= 0 ? (i + 1) + ": " + d : d;
  };

  const [value, setValue] = useState(props.options.length > 0 ? props.options[0] : "Done");

  let classes = props.classes;
  if (props.active) classes += " active";
  classes = classes.trim();

  const option = (d, i) => {
    return (
      <button 
        key={i >= 0 ? i : null} 
        className="dropdown-item"
        onClick={() => {
          setValue(d);
          if (props.callback) props.callback(d);
        }}>
          { label(d) }
      </button>
    );
  };

  const options = props.options.map(option);

  return (
    <div className="btn-group">
      <button 
        type="button" 
        className={classes}
        data-toggle={props.tooltip ? "tooltip" : null}
        title={props.tooltip ? props.tooltip : null}
        onClick={props.callback ? () => props.callback(value) : null}>
          { label(value) }
      </button>
      <button 
        type="button" 
        className={props.classes + " dropdown-toggle dropdown-toggle-split"} 
        data-toggle="dropdown" 
      />
      <div className="dropdown-menu">
        <h6 className="dropdown-header">Select label</h6>
        {options}
        {options.length > 0 ? <div className="dropdown-divider"></div> : null}
        {option("Done")}
      </div>
    </div>
  );
}

LabelButton.propTypes = {
  classes: PropTypes.string,
  active: PropTypes.bool,
  tooltip: PropTypes.string,
  shortcut: PropTypes.string,
  callback: PropTypes.func,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  value: PropTypes.string
};

LabelButton.defaultProps = {
  classes: "btn btn-outline-secondary btn-sm shadow-none",  
  active: false,
};

export default LabelButton;
