import React from "react";
import PropTypes from "prop-types";
import TraceSketch from "./TraceSketch";

class TraceSketchWrapper extends React.Component {
  constructor() {
    super();

    this.sketch = null;
    this.ref = React.createRef();
  }

  componentDidMount() {
    this.sketch = new p5(TraceSketch, this.ref.current);

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
    return <div ref={this.ref} />
  }
}

TraceSketchWrapper.propTypes = {
  experiment: PropTypes.object.isRequired,
  zoom: PropTypes.number,
  zoomPoint: PropTypes.arrayOf(PropTypes.number),
  frame: PropTypes.number.isRequired,
  editMode: PropTypes.string,
  stabilize: PropTypes.bool,
  onMouseWheel: PropTypes.func,
  onHighlightRegion: PropTypes.func.isRequired,
  onSelectRegion: PropTypes.func.isRequired,
  onSelectZoomPoint: PropTypes.func,
  onEditRegion: PropTypes.func,
  onLinkRegion: PropTypes.func
};

TraceSketchWrapper.defaultProps = {
  zoom: 1,
  zoomPoint: null,
  editMode: "filmstrip",
  stabilize: false
};

export default TraceSketchWrapper;