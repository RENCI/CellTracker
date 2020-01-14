import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import TraceSketchWrapper from "../p5/TraceSketchWrapper";
import * as ViewActionCreators from "../actions/ViewActionCreators";

function handleMouseWheel(delta) {
  ViewActionCreators.frameDelta(delta);
}

function handleSelectZoomPoint(frame, point) {
  ViewActionCreators.selectZoomPoint(frame, point);
}

function handleTranslate(point) {
  ViewActionCreators.translate(point);
}

const Filmstrip = props => {
  const divRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(divRef.current.clientWidth);
  });
  
  const numFrames = 5;
  const framePad = Math.floor(numFrames / 2);
  const active = props.playback.frame;
  
  let start = Math.max(active - framePad, 0);
  const end = Math.min(start + numFrames - 1, props.experiment.frames - 1);
  start = end - numFrames + 1;

  const w = Math.min(props.height / numFrames, width);
  
  const frames = [];  

  const divStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    alignItems: "center",
    height: props.height
  };

  const pad = "4%";

  let highlightRegion = null;

  if (props.experiment && props.experiment.segmentationData) {
    highlightRegion = props.experiment.segmentationData[active].regions.filter(region => region.highlight);
    highlightRegion = highlightRegion.length > 0 ? highlightRegion[0] : null;
  }

  let key = 0;
  for (let i = start; i <= end; i++) {
    const frameStyle = {
      flex: "0 0 auto",
      width: w,
      height: w,
      paddingTop: pad,
      paddingBottom: pad,
      paddingLeft: pad,
      paddingRight: pad,
      background: i === active ? "#007bff" : "none",
      borderRadius: pad
    };
     
    frames.push(
      <div style={frameStyle} key={key++}>          
        <TraceSketchWrapper
          experiment={props.experiment}
          zoom={props.settings.filmstripZoom}
          zoomPoint={props.settings.zoomPoint}
          frame={i}          
          stabilize={props.settings.stabilize}
          highlightRegion={highlightRegion}
          onMouseWheel={handleMouseWheel}
          onSelectZoomPoint={handleSelectZoomPoint}
          onTranslate={handleTranslate} />
      </div>
    );      
  }

  return (
    <div ref={divRef} style={divStyle}>
        {frames}
    </div>
  );
}

Filmstrip.propTypes = {
  height: PropTypes.number.isRequired,
  experiment: PropTypes.object,
  settings: PropTypes.object,
  playback: PropTypes.object
};

export default Filmstrip;
