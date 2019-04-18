var React = require("react");
var PropTypes = require("prop-types");
var TraceSketchWrapper = require("../p5/TraceSketchWrapper");
var MediaControls = require("./MediaControls");
var VisualizationContainer = require("../visualizations/VisualizationContainer");
var TrajectoryGraphContainer = require("../visualizations/TrajectoryGraphContainer");
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

function handleHighlightRegion(frame, region) {
  ViewActionCreators.highlightRegion(frame, region);
}

function handleSelectRegion(frame, region) {
  ViewActionCreators.selectRegion(frame, region);
}

function handleSelectZoomPoint(frame, point) {
  ViewActionCreators.selectZoomPoint(frame, point);
}

function PlaybackView(props) {
  return (
    <div>
      <div className="mb-3">
        <h4>Overview</h4>
        <TraceSketchWrapper
          experiment={props.experiment}
          frame={props.playback.frame}
          onKeyPress={handleKeyPress}
          onMouseWheel={handleMouseWheel}
          onHighlightRegion={handleHighlightRegion}
          onSelectRegion={handleSelectRegion}
          onSelectZoomPoint={handleSelectZoomPoint} />
        <MediaControls {...props} />
      </div>
      <h4>Trajectory Graph</h4>
      <VisualizationContainer>
        <TrajectoryGraphContainer {...props} />
      </VisualizationContainer>
    </div>
  );
}

PlaybackView.propTypes = {
  experiment: PropTypes.object,
  playback: PropTypes.object
};

module.exports = PlaybackView;
