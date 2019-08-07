import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import TraceSketchWrapper from "../p5/TraceSketchWrapper";
import MediaControls from "./MediaControls";
import EditControls from "./EditControls";
import TrajectoryGraphWrapper from "../visualizations/TrajectoryGraphWrapper";
import Frames from "./Frames";
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

function handleSelectZoomPoint(frame, point) {
  ViewActionCreators.selectZoomPoint(frame, point);
}

const frameDivStyle = {
  display: "flex",
  marginBottom: "5px"
};

const PlaybackView = props => {
  const [sketchWidth, setSketchWidth] = useState(100);
  const sketchRef = useRef(null);

  useEffect(() => {
    setSketchWidth(sketchRef.current.sketch.width);
  });

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
    <>
      <div className="row text-center">
        <div className="col-md-2">        
          <h4>Trajectories</h4>
        </div>
        <div className="col-md-8">
          <h4>Edit</h4>
        </div>
        <div className="col-md-2">        
          <h4>Frames</h4>
        </div>
      </div>

      <div className="row">
        <div className="offset-md-2 col-md-8 text-center">
          <EditControls editMode={props.settings.editMode} />        
        </div>
      </div>

      <div className="row">
        <div className="col-md-2">        
          <TrajectoryGraphWrapper height={sketchWidth} {...props} />
        </div>
        <div className="col-md-8 text-center">
          <TraceSketchWrapper
            ref={sketchRef}
            experiment={props.experiment}
            frame={props.playback.frame}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onHighlightRegion={handleHighlightRegion}
            onSelectRegion={handleSelectRegion}
            onSelectZoomPoint={handleSelectZoomPoint} />
          <MediaControls {...props} />
        </div>
        <div className="col-md-2 text-center">
          <Frames height={sketchWidth} {...props} />
        </div>
      </div>
    </>
  );
}

PlaybackView.propTypes = {
  experiment: PropTypes.object,
  settings: PropTypes.object,
  playback: PropTypes.object
};

export default PlaybackView;
