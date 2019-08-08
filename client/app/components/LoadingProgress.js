import React from "react";
import PropTypes from "prop-types";

const LoadingProgress = props => {
  const v1 = Math.min(props.value1 + 1, props.max1);
  const v2 = Math.min(props.value2 + 1, props.max2);

  const style1 = {
    width: props.max1 === 0 ? 0 : v1 / props.max1 * 50 + "%",
    transition: v1 === props.max1 ? "none" : null
  };

  const style2 = {
    width: props.max2 === 0 ? 0 : v2 / props.max2 * 50 + "%",
    transition: v2 === props.max2 ? "none" : null
  };

  return (
    <div>
      <h5>
        {props.heading}
        <small className="text-muted ml-1">{props.subHeading}</small>
      </h5>
      <div className="progress">
        <div className="progress-bar progress-bar-striped progress-bar-animated" style={style1} />
        <div className="progress-bar bg-success progress-bar-striped progress-bar-animated" style={style2} />
      </div>
    </div>
  );
}

LoadingProgress.propTypes = {
  heading: PropTypes.string,
  subHeading: PropTypes.string,
  value1: PropTypes.number.isRequired,
  max1: PropTypes.number.isRequired,
  value2: PropTypes.number.isRequired,
  max2: PropTypes.number.isRequired
};

LoadingProgress.defaultProps = {
  heading: "Loading...",
  subHeading: ""
};

export default LoadingProgress;
