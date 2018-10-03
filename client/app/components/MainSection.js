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

function MainSection(props) {
  // Put in DataStore?
  var experimentName = props.experiment ? props.experiment.name : null;

  //var regionSelected = props.experiment ?

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
              value1={props.loading.image}
              maxValue1={props.loading.numImages}
              value2={props.loading.segmentation}
              maxValue2={props.loading.numSegmentation} />
          : null}
          {props.loading === null ?
            <div>
              <TraceSketchWrapper
                {...props}
                onKeyPress={handleKeyPress}
                onMouseWheel={handleMouseWheel}
                onSelectRegion={handleSelectRegion}
                onUpdateTrace={handleUpdateTrace} />
              <MediaControls {...props} />
            </div>
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
