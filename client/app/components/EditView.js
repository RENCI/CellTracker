import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import TraceSketchWrapper from "../p5/TraceSketchWrapper";
import MediaControls from "./MediaControls";
import EditControls from "./EditControls";
import TrajectoryGraphWrapper from "../visualizations/TrajectoryGraphWrapper";
import Filmstrip from "./Filmstrip";
import FilmstripControls from "./FilmstripControls";
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

function handleTranslate(point) {
  ViewActionCreators.translate(point);
}

function handleEditRegion(frame, region) {
  ViewActionCreators.editRegion(frame, region);
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
        <div className="offset-md-2 col-md-8">
          <EditControls editMode={props.settings.editMode} />        
        </div>
        <div className="col-md-2">
          <FilmstripControls />        
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
            zoom={props.settings.zoom}
            zoomPoint={props.settings.zoomPoint}
            frame={props.playback.frame}
            editMode={props.settings.editMode}
            onKeyPress={handleKeyPress}
            onMouseWheel={handleMouseWheel}
            onHighlightRegion={handleHighlightRegion}
            onSelectRegion={handleSelectRegion}
            onSelectZoomPoint={handleSelectZoomPoint}
            onTranslate={handleTranslate}
            onEditRegion={handleEditRegion} />
          <MediaControls {...props} />
        </div>
        <div className="col-md-2 text-center">
          <Filmstrip height={sketchWidth} {...props} />
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
