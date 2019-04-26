import React from "react";
import PropTypes from "prop-types";
import TraceSketch from "./TraceSketch";

class TraceSketchWrapper extends React.Component {
  constructor() {
    super();

    this.sketch = null;
  }

  componentDidMount() {
    this.sketch = new p5(TraceSketch, this.ref);
    this.sketch.updateProps(this.props);
  }

  shouldComponentUpdate(props, state) {
    this.sketch.updateProps(props);

    return false;
  }

  componentWillUnmount() {
    this.sketch.remove();
    this.sketch = null;
  }

  render() {
    return <div ref={ref => this.ref = ref} />
  }
}

TraceSketchWrapper.propTypes = {
  experiment: PropTypes.object.isRequired,
  zoom: PropTypes.number,
  zoomPoint: PropTypes.arrayOf(PropTypes.number),
  frame: PropTypes.number.isRequired,
  editMode: PropTypes.string,
  stabilize: PropTypes.bool,
  onKeyPress: PropTypes.func.isRequired,
  onMouseWheel: PropTypes.func.isRequired,
  onHighlightRegion: PropTypes.func.isRequired,
  onSelectRegion: PropTypes.func.isRequired,
  onSelectZoomPoint: PropTypes.func,
  onEditRegion: PropTypes.func
};

TraceSketchWrapper.defaultProps = {
  zoom: 1,
  zoomPoint: null,
  editMode: "playback",
  stabilize: false
};

export default TraceSketchWrapper;