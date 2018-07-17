// Controller-view for the application that stores the current dataset

var React = require("react");
var HeaderSection = require("../components/HeaderSection");
var MainSection = require("../components/MainSection");
var DataStore = require("../stores/DataStore");
var ViewActionCreators = require("../actions/ViewActionCreators");

function getStateFromStore() {
  return {
    experimentList: DataStore.getExperimentList(),
    experiment: DataStore.getExperiment()
  };
}

class AppContainer extends React.Component {
  constructor() {
    super();

    this.state = getStateFromStore();

    // Need to bind this to callback functions here
    this.onDataChange = this.onDataChange.bind(this);
  }

  componentDidMount() {
    DataStore.addChangeListener(this.onDataChange);

    // Bootstrap the application by getting initial data here
    ViewActionCreators.getExperimentList();
  }

  componentWillUnmount() {
    DataStore.removeChangeListener(this.onDataChange);
  }

  onDataChange() {
    this.setState(getStateFromStore());
  }

  render() {
    return (
      <div className="container-fluid">
        <HeaderSection />
        {this.state.experiment ? <MainSection {...this.state} /> : null}
      </div>
    );
  }
}

module.exports = AppContainer;
