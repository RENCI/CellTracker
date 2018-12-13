// Controller-view for the application that stores the current dataset

var React = require("react");
var MainSection = require("../components/MainSection");
var DataStore = require("../stores/DataStore");
var ViewActionCreators = require("../actions/ViewActionCreators");

function getStateFromStore() {
  return {
    experimentList: DataStore.getExperimentList(),
    experiment: DataStore.getExperiment(),
    settings: DataStore.getSettings(),
    loading: DataStore.getLoading(),
    playback: DataStore.getPlayback(),
    traces: DataStore.getTraces()
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

    // Bootstrap the application by getting the experiment list here
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
        <MainSection {...this.state} />
      </div>
    );
  }
}

module.exports = AppContainer;
