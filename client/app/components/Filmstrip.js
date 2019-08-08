import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import TraceSketchWrapper from "../p5/TraceSketchWrapper";
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

function handleHighlightRegion(frame, region) {
  ViewActionCreators.highlightRegion(frame, region);
}

function handleSelectRegion(frame, region) {
  ViewActionCreators.selectRegion(frame, region);
}

const Filmstrip = props => {
  const divRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(divRef.current.clientWidth);
  });
  
  const numFrames = 5;
  const center = props.playback.frame;
  const framePad = Math.floor(numFrames / 2);

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

  let key = 0;
  for (let i = center - framePad; i <= center + framePad; i++) {
    const valid = i >= 0 && i < props.experiment.frames;

    const frameStyle = {
      flex: "0 0 auto",
      width: w,
      height: w,
      paddingTop: pad,
      paddingBottom: pad,
      paddingLeft: pad,
      paddingRight: pad,
      background: i === center ? "#007bff" : "none",
      borderRadius: pad, 
      visibility: valid ? "visible" : "hidden"
    };
     
    // Avoid unmounting by making invalid frames invisible, and set to the first frame
    frames.push(
      <div style={frameStyle} key={key++}>          
        <TraceSketchWrapper
          experiment={props.experiment}
          zoom={props.settings.filmstripZoom}
          zoomPoint={props.settings.zoomPoint}
          frame={valid ? i : 0}
          stabilize={props.settings.stabilize}
          onHighlightRegion={handleHighlightRegion}
          onSelectRegion={handleSelectRegion} />
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
