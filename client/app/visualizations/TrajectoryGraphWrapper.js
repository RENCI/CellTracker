import React from "react";
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

  componentDidMount() {
    this.drawVisualization(this.props);
  }

  shouldComponentUpdate(props, state) {
    this.drawVisualization(props);

    return false;
  }

  drawVisualization(props, state) {
    const width = this.ref.clientWidth;

    this.trajectoryGraph
        .width(width)
        .height(props.height)
        .currentFrame(props.playback.frame)
        .zoomPoint(props.settings.zoomPoint)
        .zoom(props.settings.zoom);

    d3.select(this.ref)
        .datum(props.experiment)
        .call(this.trajectoryGraph);
  }

  render() {
    return <div style={{overflowX: "auto"}} ref={ref => this.ref = ref}></div>
  }
}

TrajectoryGraphWrapper.propTypes = {
  height: PropTypes.number.isRequired,
  experiment: PropTypes.object.isRequired,
  playback: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired
};

export default TrajectoryGraphWrapper;
