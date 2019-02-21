var React = require("react");
var PropTypes = require("prop-types");

function LoadingProgress(props) {
  var style1 = {
    width: props.value1 / props.max1 * 50 + "%",
    transition: props.value1 === props.max1 ? "none" : null
  };

  var style2 = {
    width: props.value2 / props.max2 * 50 + "%",
    transition: props.value2 === props.max2 ? "none" : null
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

module.exports = LoadingProgress;
