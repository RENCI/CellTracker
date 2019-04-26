import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import TrajectoryGraph from "./TrajectoryGraph";
import { highlightRegion, selectRegion, setFrame } from "../actions/ViewActionCreators";

class TrajectoryGraphWrapper extends React.Component {
  constructor() {
    super();

    this.onSelectRegion = this.onSelectRegion.bind(this);
    this.onSetFrame = this.onSetFrame.bind(this);

    // Create visualization function
    this.trajectoryGraph = TrajectoryGraph()
        .on("highlightRegion", this.onHighlightRegion)
        .on("selectRegion", this.onSelectRegion)
        .on("setFrame", this.onSetFrame);
  }

  onHighlightRegion(frame, region) {
    highlightRegion(frame, region);
  }

  onSelectRegion(frame, region) {
    selectRegion(frame, region);
  }

  onSetFrame(frame) {
    setFrame(frame);
  }

  shouldComponentUpdate(props, state) {
    this.drawVisualization(props, state);

    return false;
  }

  drawVisualization(props, state) {
    const width = this.ref.clientWidth;

    this.trajectoryGraph
        .width(width)
        .height(width / 4)
        .currentFrame(props.playback.frame);

    d3.select(this.ref)
        .datum(props.experiment)
        .call(this.trajectoryGraph);
  }

  render() {
    return <div ref={ref => this.ref = ref}></div>
  }
}

TrajectoryGraphWrapper.propTypes = {
  experiment: PropTypes.object.isRequired,
  playback: PropTypes.object.isRequired
};

export default TrajectoryGraphWrapper;
