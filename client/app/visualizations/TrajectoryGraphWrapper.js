import React from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import TrajectoryGraph from "./TrajectoryGraph";
import { highlightRegion, selectRegion, setFrame, linkRegion } from "../actions/ViewActionCreators";

class TrajectoryGraphWrapper extends React.Component {
  constructor() {
    super();

    this.state = { 
      scrollPosition: 0
    };

    this.onHighlightRegion = this.onHighlightRegion.bind(this);
    this.onSelectRegion = this.onSelectRegion.bind(this);
    this.onSetFrame = this.onSetFrame.bind(this);
    this.onLinkRegion = this.onLinkRegion.bind(this);
    this.onScroll = this.onScroll.bind(this);

    // Create visualization function
    this.trajectoryGraph = TrajectoryGraph()
        .on("highlightRegion", this.onHighlightRegion)
        .on("selectRegion", this.onSelectRegion)
        .on("setFrame", this.onSetFrame)
        .on("linkRegion", this.onLinkRegion);

    this.centerRegion = null;
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

  onLinkRegion(frame, region) {
    linkRegion(frame, region);
  }

  onScroll(event) {
    this.setState({ 
      scrollPosition: event.target.scrollLeft
    });
  }

  componentDidMount() {
    this.drawVisualization(this.props, this.state);
  }

  shouldComponentUpdate(props, state) {
    this.drawVisualization(props, state);

    // Make sure newly selected region visible
    if (props.experiment.centerRegion !== this.centerRegion) {
      this.centerRegion = props.experiment.centerRegion;

      const x = this.trajectoryGraph.getX(this.centerRegion);
      const pos = this.ref.scrollLeft;
      const width = this.ref.clientWidth;

      if (x < pos || x > pos + width) {
        this.ref.scrollTo({
          top: 0,
          left: x - width / 2,
          behavior: "smooth"
        });
      }
    }

    return false;
  }

  drawVisualization(props, state) {
    const width = this.ref.clientWidth;

    this.trajectoryGraph
        .width(width)
        .height(props.height)
        .scrollPosition(state.scrollPosition)
        .currentFrame(props.playback.frame)
        .maxFrames(props.settings.trajectoryFrames)
        .editMode(props.settings.editMode);

    d3.select(this.ref)
        .datum(props.experiment)
        .call(this.trajectoryGraph);
  }

  render() {
    return (
      <div 
        style={{overflowX: "auto"}} 
        ref={ref => this.ref = ref}
        onScroll={this.onScroll}>      
      </div>
    );
  }
}

TrajectoryGraphWrapper.propTypes = {
  height: PropTypes.number.isRequired,
  experiment: PropTypes.object.isRequired,
  playback: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired
};

export default TrajectoryGraphWrapper;
