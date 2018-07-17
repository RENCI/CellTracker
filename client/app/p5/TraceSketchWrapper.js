var React = require("react");
var PropTypes = require("prop-types");
var TraceSketch = require("./TraceSketch");

class TraceSketchWrapper extends React.Component {
  constructor() {
    super();

    this.sketch = null;
  }

  componentDidMount() {
    console.log(this.props.experiment);

    this.sketch = new p5(TraceSketch, this.div);
  }

  componentWillReceiveProps(props, newProps) {
    if (this.sketch.myCustomRedrawAccordingToNewPropsHandler) {
      this.sketch.myCustomRedrawAccordingToNewPropsHandler(newProps);
    }
  }

  shouldComponentUpdate(props, state) {
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
