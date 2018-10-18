var React = require("react");
var PropTypes = require("prop-types");
var TraceSketchWrapper = require("../p5/TraceSketchWrapper");
var MediaControls = require("./MediaControls");
var ViewActionCreators = require("../actions/ViewActionCreators");

function handleKeyPress(keyCode) {
  switch (keyCode) {
    case 32:
      // Space bar
      ViewActionCreators.togglePlay();
      break;

    case 37:
      // Left arrow
      ViewActionCreators.frameDelta(-1);
      break;

    case 39:
      // Right arrow
      ViewActionCreators.frameDelta(1);
      break;
  }
}

function handleMouseWheel(delta) {
  ViewActionCreators.frameDelta(delta);
}

function handleUpdateFrame(frame) {
  ViewActionCreators.updateFrame(frame);
}

function handleSelectRegion(frame, region) {
  ViewActionCreators.selectRegion(frame, region);
}

function handleUpdateTrace(points) {
  ViewActionCreators.updateTrace(points);
}

var frameDivStyle = {
  display: "flex",
  marginBottom: "5px"
};

function EditView(props) {
  var frame = props.experiment.selectedRegion.frame;
  var frames = [];

  for (var i = frame - 2; i <= frame + 2; i++) {
    var frameStyle = {
      flex: "1, 1, 100%",
      width: "100%",
      marginLeft: "2px",
      marginRight: "2px",
      background: i === props.playback.frame ? "#ccc" : "none"
    };

    if (i < 0 || i >= props.experiment.frames) {
      frames.push(
        <div style={frameStyle} key={i}>
        </div>
      );
    }
    else {
      frames.push(
        <div style={frameStyle} key={i}>
          <TraceSketchWrapper
            experiment={props.experiment}
            traces={props.traces}
            frame={i}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onSelectRegion={handleSelectRegion}
            onUpdateTrace={handleUpdateTrace} />
        </div>
      );
    }
  }

  return (
    <div>
      <div className="row">
        <div className="offset-md-3 col-md-6">
          <TraceSketchWrapper
            experiment={props.experiment}
            traces={props.traces}
            frame={props.experiment.selectedRegion.frame}
            editMode={true}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onSelectRegion={handleSelectRegion}
            onUpdateTrace={handleUpdateTrace} />
          <TraceSketchWrapper
            experiment={props.experiment}
            traces={props.traces}
            frame={props.playback.frame}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onSelectRegion={handleSelectRegion}
            onUpdateTrace={handleUpdateTrace} />
          <div style={frameDivStyle}>
            {frames}
          </div>
          <MediaControls {...props} />
        </div>
      </div>
    </div>
  );
}

EditView.propTypes = {
  experiment: PropTypes.object,
  playback: PropTypes.object,
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

module.exports = EditView;
