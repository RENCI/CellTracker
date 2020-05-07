import React from "react";
import PropTypes from "prop-types";

const LabelButton = props => {
  const label = d => {
    const i = props.experimentLabels.indexOf(d);

    return i >= 0 ? (i + 1) + ": " + d : d;
  };

  let classes = props.classes;
  if (props.active) classes += " active";
  classes = classes.trim();

  const option = (d, i) => {
    return (
      <button 
        key={i >= 0 ? i : null} 
        className="dropdown-item"
        onClick={() => {
          if (props.onChange) props.onChange(d);
        }}>
          { label(d) }
      </button>
    );
  };

  const experimentOptions = props.experimentLabels.map(option);
  const defaultOptions = props.defaultLabels.map(option);

  return (
    <div className="btn-group">
      <button 
        type="button" 
        className={classes}
        data-toggle={props.tooltip ? "tooltip" : null}
        title={props.tooltip ? props.tooltip : null}
        onClick={props.onClick ? () => props.onClick(props.value) : null}>
          { label(props.value) }
      </button>
      <button 
        type="button" 
        className={props.classes + " dropdown-toggle dropdown-toggle-split"} 
        data-toggle="dropdown" 
      />
      <div className="dropdown-menu">
        <h6 className="dropdown-header">Select label</h6>
        {experimentOptions}
        {experimentOptions.length > 0 ? <div className="dropdown-divider"></div> : null}
        {defaultOptions}
      </div>
    </div>
  );
}

LabelButton.propTypes = {
  classes: PropTypes.string,
  active: PropTypes.bool,
  tooltip: PropTypes.string,
  shortcut: PropTypes.string,
  onClick: PropTypes.func,
  onChange: PropTypes.func,
  experimentLabels: PropTypes.arrayOf(PropTypes.string).isRequired,
  defaultLabels: PropTypes.arrayOf(PropTypes.string).isRequired,
  value: PropTypes.string.isRequired
};

LabelButton.defaultProps = {
  classes: "btn btn-outline-secondary btn-sm shadow-none",  
  active: false,
};

export default LabelButton;
