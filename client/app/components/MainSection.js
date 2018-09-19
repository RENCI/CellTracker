var React = require("react");
var PropTypes = require("prop-types");
var Controls = require("./Controls");
var LoadingProgress = require("./LoadingProgress");
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
      ViewActionCreators.frameBack();
      break;

    case 39:
      // Right arrow
      ViewActionCreators.frameForward();
      break;
  }
}

function handleMouseWheel(delta) {
  ViewActionCreators.frameDelta(delta);
}

function handleUpdateLoading(frame, numFrames) {
  ViewActionCreators.updateLoading(frame, numFrames);
}

function handleUpdateFrame(frame) {
  ViewActionCreators.updateFrame(frame);
}

function handleUpdateTrace(points) {
  ViewActionCreators.updateTrace(points);
}

function MainSection(props) {
  // Put in DataStore?
  var experimentName = props.experiment ?
    props.experimentList.filter(function (experiment) {
      return props.experiment.id === experiment.id;
    })[0].name : null;

  return (
    <div className="row">
      <div className="col-md-2">
        <Controls {...props} />
      </div>
      {props.experiment ?
        <div className="col-md-10 text-center" id="sketchDiv">
          {props.loading !== null ?
            <LoadingProgress
              label={"Loading " + experimentName}
              value={props.loading.frame}
              maxValue={props.loading.numFrames} />
          : null}
          <TraceSketchWrapper
            {...props}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onUpdateLoading={handleUpdateLoading}
            onUpdateFrame={handleUpdateFrame}
            onUpdateTrace={handleUpdateTrace} />
          {props.loading === null ?
            <MediaControls {...props} />
          : null}
        </div>
    : null}
    </div>
  );
}

MainSection.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object,
  loading: PropTypes.object,
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

module.exports = MainSection;
