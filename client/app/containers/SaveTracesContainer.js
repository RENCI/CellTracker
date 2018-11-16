var React = require("react");
var SaveTraces = require("../components/SaveTraces");
var ViewActionCreators = require("../actions/ViewActionCreators");

class SaveTracesContainer extends React.Component {
  constructor() {
    super();

    // Need to bind this to callback functions here
    this.onSaveTracesClick = this.onSaveTracesClick.bind(this);
  }

  onSaveTracesClick() {
    ViewActionCreators.saveTraces();
  }

  render() {
    return (
      <SaveTraces
        onSaveTracesClick={this.onSaveTracesClick} />
    );
  }
}

module.exports = SaveTracesContainer;
