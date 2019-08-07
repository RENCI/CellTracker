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

const Frames = props => {
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
    height: props.height
  };

  for (let i = center - framePad; i <= center + framePad; i++) {
    const frameStyle = {
      flex: "0 0 auto",
      width: w,
      height: w,
      paddingTop: "5px",
      paddingLeft: "5px",
      paddingRight: "5px",
      borderRadius: "5px",
      background: i === center ? "#007bff" : "none"
    };

    if (i < 0 || i >= props.experiment.frames) {
      frames.push(
        <div style={frameStyle} key={i}>
        </div>
      );
    }
    else {      
      frames.push(
        <div style={frameStyle} key={i}>          
          <TraceSketchWrapper
            experiment={props.experiment}
            zoom={props.settings.playbackZoom ? props.settings.playbackZoom : 1 }
            zoomPoint={props.settings.zoomPoint ? props.settings.zoomPoint : [0, 0] }
            frame={i}
            stabilize={props.settings.stabilize}
            onHighlightRegion={handleHighlightRegion}
            onSelectRegion={handleSelectRegion} />
        </div>
      );      
    }
  }

  return (
    <div ref={divRef} style={divStyle}>
      {frames}
    </div>
  );
}

Frames.propTypes = {
  height: PropTypes.number.isRequired,
  experiment: PropTypes.object,
  settings: PropTypes.object,
  playback: PropTypes.object
};

export default Frames;