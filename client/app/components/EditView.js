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

function handleSelectRegion(region) {
  ViewActionCreators.selectRegion(region);
}

function handleUpdateTrace(points) {
  ViewActionCreators.updateTrace(points);
}

function EditView(props) {
  return (
    <div>
      <div className="row">
        <div className="offset-md-3 col-md-6 text-center">
          <MediaControls {...props} />
          <TraceSketchWrapper
            {...props}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onSelectRegion={handleSelectRegion}
            onUpdateTrace={handleUpdateTrace} />
        </div>
      </div>
      <div className="row">
        <div className="offset-md-3 col-md-6 text-center">
          <TraceSketchWrapper
            {...props}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onSelectRegion={handleSelectRegion}
            onUpdateTrace={handleUpdateTrace} />
        </div>
      </div>
    </div>
  );
}

EditView.propTypes = {
  experiment: PropTypes.object,
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

module.exports = EditView;
