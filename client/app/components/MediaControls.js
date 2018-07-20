var React = require("react");
var PropTypes = require("prop-types");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onStopClick() {
  ViewActionCreators.stopPlay();
}

function onPlayClick(e) {
  ViewActionCreators.togglePlay();
}

var rangeStyle = {
  marginLeft: 5
};

function button(icon, callback) {
  return (
    <button
      type="button"
      className="btn btn-default"
      onClick={callback}>
        <span className={"glyphicon " + icon}></span>
    </button>
  );
}

function MediaControls(props) {
  return (
    <div className="input-group input-group-sm">
      <div className="input-group-btn">
        {button("glyphicon-stop", onStopClick)}
        {button("glyphicon-play", onPlayClick)}
      </div>
      <input className="form-control" type="range" min="0" max="100" style={rangeStyle} />
    </div>
  );
}

MediaControls.propTypes = {
};

module.exports = MediaControls;
