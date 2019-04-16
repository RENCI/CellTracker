const React = require("react");
const PropTypes = require("prop-types");
const d3 = require("d3");
const TrajectoryGraph = require("./TrajectoryGraph");
const ViewActionCreators = require("../actions/ViewActionCreators");

class TrajectoryGraphContainer extends React.Component {
  constructor() {
    super();

    this.onSelectRegion = this.onSelectRegion.bind(this);
    this.onSetFrame = this.onSetFrame.bind(this);

    // Create visualization function
    this.trajectoryGraph = TrajectoryGraph()
        .on("selectRegion", this.onSelectRegion)
        .on("setFrame", this.onSetFrame);
  }

  onSelectRegion(frame, region) {
    ViewActionCreators.selectRegion(frame, region);
  }

  onSetFrame(frame) {
    ViewActionCreators.setFrame(frame);
  }

  shouldComponentUpdate(props, state) {
    this.drawVisualization(props, state);

    return false;
  }

  drawVisualization(props, state) {
    this.trajectoryGraph
        .width(props.width)
        .height(props.width / 2)
        .currentFrame(props.playback.frame);

    d3.select(this.div)
        .datum(props.experiment)
        .call(this.trajectoryGraph);
  }

  render() {
    return <div ref={div => this.div = div} ></div>
  }
}

// Don't make propsTypes required, as a warning is given for the first render
// if using React.cloneElement, as in VisualizationContainer
TrajectoryGraphContainer.propTypes = {
  width: PropTypes.number,
  experiment: PropTypes.object,
  playback: PropTypes.object
};

module.exports = TrajectoryGraphContainer;
