var React = require("react");

class VisualizationContainer extends React.Component {
  constructor() {
    super();

    this.state = {
      width: 100,
      height: 100
    };
  }

  componentDidMount() {
    this.checkSize();
  }

  componentDidUpdate(prevProps, prevState) {
    this.checkSize();
  }

  checkSize() {
    if (this.state.width !== this.div.clientWidth ||
        this.state.height !== this.div.clientHeight) {
      this.setState({
        width: this.div.clientWidth,
        height: this.div.clientHeight
      });
    }
  }

  render() {
    const props = {
      width: this.state.width,
      height: this.state.height
    };

    return (
      <div ref={(div => this.div = div)}>
        {React.cloneElement(this.props.children, props)}
      </div>
    );
  }
}

module.exports = VisualizationContainer;
