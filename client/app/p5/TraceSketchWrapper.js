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

  render() {
    return <div ref={div => this.div = div} />
  }
}

TraceSketchWrapper.propTypes = {
  experiment: PropTypes.object.isRequired
};

module.exports = TraceSketchWrapper;
