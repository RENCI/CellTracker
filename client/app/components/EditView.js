import React from "react";
import PropTypes from "prop-types";
import TraceSketchWrapper from "../p5/TraceSketchWrapper";
import PlaybackControls from "./PlaybackControls";
import MediaControls from "./MediaControls";
import EditControls from "./EditControls";
import TooltipContainer from "../containers/TooltipContainer";
import VisualizationContainer from "../visualizations/VisualizationContainer";
import TrajectoryGraphContainer from "../visualizations/TrajectoryGraphContainer";
import * as ViewActionCreators from "../actions/ViewActionCreators";

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

const frameDivStyle = {
  display: "flex",
  marginBottom: "5px"
};

const EditView = props => {
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
      <div className="row mb-3">
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
          <h4>Trajectory Graph</h4>
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

export default EditView;
