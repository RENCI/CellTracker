var React = require("react");
var PropTypes = require("prop-types");

function LoadingProgress(props) {
  var style1 = {
    width: props.value1 / props.maxValue1 * 50 + "%",
    transition: props.value1 === props.maxValue1 ? "none" : null
  };

  var style2 = {
    width: props.value2 / props.maxValue2 * 50 + "%",
    transition: props.value2 === props.maxValue2 ? "none" : null
  };

  return (
    <div>
      <h4>{props.label}</h4>
      <div className="progress">
        <div className="progress-bar progress-bar-striped progress-bar-animated" style={style1} />
        <div className="progress-bar bg-success progress-bar-striped progress-bar-animated" style={style2} />
      </div>
    </div>
  );
}

LoadingProgress.propTypes = {
  label: PropTypes.string.isRequired,
  value1: PropTypes.number.isRequired,
  maxValue1: PropTypes.number.isRequired,
  value2: PropTypes.number.isRequired,
  maxValue2: PropTypes.number.isRequired
};

module.exports = LoadingProgress;
