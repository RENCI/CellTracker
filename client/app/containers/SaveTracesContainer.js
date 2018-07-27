var React = require("react");
var SaveTraces = require("../components/SaveTraces");
var ViewActionCreators = require("../actions/ViewActionCreators");

class SaveTracesContainer extends React.Component {
  constructor() {
    super();

    this.state = {
      userName: null
    };

    // Need to bind this to callback functions here
    this.onUserNameChange = this.onUserNameChange.bind(this);
    this.onSaveTracesClick = this.onSaveTracesClick.bind(this);
  }

  onUserNameChange(e) {
    if (e.target.value === "") {
      this.setState({
        userName: null
      });
    }
    else if (e.target.value.match(/^\w+$/)) {
      this.setState({
        userName: e.target.value
      });
    }
  }

  onSaveTracesClick() {
    ViewActionCreators.saveTraces(this.state.userName);
  }

  render() {
    return (
      <SaveTraces
        userName={this.state.userName}
        onUserNameChange={this.onUserNameChange}
        onSaveTracesClick={this.onSaveTracesClick} />
    );
  }
}

module.exports = SaveTracesContainer;
