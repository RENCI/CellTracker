import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import TraceSketchWrapper from "../p5/TraceSketchWrapper";
import MediaControls from "./MediaControls";
import EditControls from "./EditControls";
import TrajectoryGraphWrapper from "../visualizations/TrajectoryGraphWrapper";
import Filmstrip from "./Filmstrip";
import FilmstripControls from "./FilmstripControls";
import Score from "./Score";
import Progress from "./Progress";
import * as ViewActionCreators from "../actions/ViewActionCreators";

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

function handleLinkRegion(frame, region) {
  ViewActionCreators.linkRegion(frame, region);
}

function handleRegionDone(region, done) {
  ViewActionCreators.regionDone(region, done);
}

const EditView = props => {
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
          <EditControls 
            editMode={props.settings.editMode}
            history={props.history}
            labels={props.experiment.labels}
            currentLabel={props.settings.currentLabel} />        
        </div>
        <div className="col-md-2">
          <FilmstripControls />        
        </div>
      </div>

      <div className="row">
        <div className="col-md-2">        
          {props.settings.showTrajectories ? <TrajectoryGraphWrapper height={sketchWidth} {...props} /> : null}
        </div>
        <div className="col-md-8 text-center">
          <TraceSketchWrapper
            ref={sketchRef}
            experiment={props.experiment}
            zoom={props.settings.zoom}
            zoomPoint={props.settings.zoomPoint}
            frame={props.playback.frame}
            editMode={props.settings.editMode}
            currentLabel={props.settings.currentLabel}
            onMouseWheel={handleMouseWheel}
            onHighlightRegion={handleHighlightRegion}
            onSelectRegion={handleSelectRegion}
            onSelectZoomPoint={handleSelectZoomPoint}
            onTranslate={handleTranslate}
            onEditRegion={handleEditRegion}
            onLinkRegion={handleLinkRegion}
            onRegionDone={handleRegionDone} />
          <MediaControls {...props} />
        </div>
        <div className="col-md-2 text-center">
          <Filmstrip height={sketchWidth} {...props} />
        </div>
      </div>

      <div className="row text-center mt-3">
        <div className="offset-md-2 col-md-4">
          <Score {...props} />
        </div>
        <div className="col-md-4">
          <Progress {...props} />
        </div>
      </div>
    </>
  );
}

EditView.propTypes = {
  experiment: PropTypes.object,
  settings: PropTypes.object,
  playback: PropTypes.object,
  history: PropTypes.object
};

export default EditView;
