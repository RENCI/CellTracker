var React = require("react");
var PropTypes = require("prop-types");

class TooltipContainer extends React.Component {
  constructor() {
    super();
  }

  componentDidMount() {    
    // Enable tooltips
    $(this.div).find("[data-toggle='tooltip']").tooltip();
  }

  componentDidUpdate() {
    // Hide any open tooltips
    $(this.div).find("[data-toggle='tooltip']").tooltip("hide");
  }

  render() {
    return (
      <div ref={div => this.div = div} >
        {this.props.children}
      </div>
    );
  }
}

module.exports = TooltipContainer;
