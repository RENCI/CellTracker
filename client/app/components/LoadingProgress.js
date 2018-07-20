var React = require("react");
var PropTypes = require("prop-types");

function LoadingProgress(props) {
  var style = {
    width: props.value / props.maxValue * 100 + "%",
    transition: props.value === props.maxValue ? "none" : null
  };

  return (
    <div>
      <h3>{props.label}</h3>
      <div className="progress">
        <div className="progress-bar progress-bar-striped active" style={style} />
      </div>
    </div>
  );
}

LoadingProgress.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  maxValue: PropTypes.number.isRequired
};

module.exports = LoadingProgress;