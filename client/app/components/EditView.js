var React = require("react");
var PropTypes = require("prop-types");
var TraceSketchWrapper = require("../p5/TraceSketchWrapper");
var PlaybackControls = require("./PlaybackControls");
var MediaControls = require("./MediaControls");
var EditControls = require("./EditControls");
var TooltipContainer = require("../containers/TooltipContainer");
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

function handleEditRegion(frame, region) {
  ViewActionCreators.editRegion(frame, region);
}

var frameDivStyle = {
  display: "flex",
  marginBottom: "5px"
};

function EditView(props) {
  const frame = props.experiment.editFrame;
  const frames = [];
  let framesIndex = -1;

  for (let i = 0; i < props.experiment.frames; i++) {
    if (i % 5 === 0) {
      framesIndex = frames.push([]) - 1;
    }

    const frameStyle = {
      flex: "1",
      width: "0px",
      paddingTop: "5px",
      paddingLeft: "5px",
      paddingRight: "5px",
      borderRadius: "5px",
      background: i === props.playback.frame ? "#007bff" : "none"
    };

    if (i < 0 || i >= props.experiment.frames) {
      frames[framesIndex].push(
        <div style={frameStyle} key={i}>
        </div>
      );
    }
    else {
      frames[framesIndex].push(
        <div style={frameStyle} key={i}>
          <TraceSketchWrapper
            experiment={props.experiment}
            zoom={props.settings.playbackZoom}
            zoomPoint={props.settings.zoomPoint}
            frame={i}
            stabilize={props.settings.stabilize}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onHighlightRegion={handleHighlightRegion}
            onSelectRegion={handleSelectRegion} />
        </div>
      );
    }
  }

  return (
    <div>
      <div className="row">
        <div className="col-md-5">
          <h4>Playback</h4>
          <TooltipContainer>
            <PlaybackControls />
          </TooltipContainer>
          <TraceSketchWrapper
            experiment={props.experiment}
            zoom={props.settings.playbackZoom}
            zoomPoint={props.settings.zoomPoint}
            frame={props.playback.frame}
            stabilize={props.settings.stabilize}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onHighlightRegion={handleHighlightRegion}
            onSelectRegion={handleSelectRegion} />       
            {frames.map((frames, i) => {
              return (
                <div style={frameDivStyle} key={i}>
                  {frames}
                </div>          
              );
            })}         
          <MediaControls {...props} />
        </div>
        <div className="col-md-7">
          <h4>Edit</h4>
          <TooltipContainer>
            <EditControls editMode={props.settings.editMode} />
          </TooltipContainer>
          <TraceSketchWrapper
            experiment={props.experiment}
            zoom={props.settings.editZoom}
            zoomPoint={props.settings.zoomPoint}
            frame={props.experiment.editFrame}
            editMode={props.settings.editMode}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onSelectRegion={handleSelectRegion}
            onHighlightRegion={handleHighlightRegion}
            onEditRegion={handleEditRegion} />
        </div>
      </div>
      <div className="row">
        <div className="col-md-12">
          <VisualizationContainer>
            <TrajectoryGraphContainer {...props} />
          </VisualizationContainer>
        </div>
      </div>
    </div>
  );
}

EditView.propTypes = {
  experiment: PropTypes.object,
  settings: PropTypes.object,
  playback: PropTypes.object
};

module.exports = EditView;
