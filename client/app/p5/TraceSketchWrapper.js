var React = require("react");
var PropTypes = require("prop-types");
var TraceSketch = require("./TraceSketch");

class TraceSketchWrapper extends React.Component {
  constructor() {
    super();

    this.sketch = null;
  }

  componentDidMount() {
    this.sketch = new p5(TraceSketch, this.div);
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
    return <div ref={div => this.div = div} />
  }
}

TraceSketchWrapper.propTypes = {
  experiment: PropTypes.object.isRequired,
  zoom: PropTypes.number,
  traces: PropTypes.arrayOf(PropTypes.object).isRequired,
  frame: PropTypes.number.isRequired,
  editMode: PropTypes.string,
  onKeyPress: PropTypes.func.isRequired,
  onMouseWheel: PropTypes.func.isRequired,
  onSelectRegion: PropTypes.func.isRequired,
  onEditRegion: PropTypes.func,
  onUpdateTrace: PropTypes.func.isRequired
};

TraceSketchWrapper.defaultProps = {
  zoom: 1,
  editMode: "playback"
};

module.exports = TraceSketchWrapper;
