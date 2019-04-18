// Controller-view for the application that stores the current dataset

var React = require("react");
var MainSection = require("../components/MainSection");
var ResizeContainer = require("./ResizeContainer");
var DataStore = require("../stores/DataStore");
var ViewActionCreators = require("../actions/ViewActionCreators");

function getStateFromStore() {
  return {
    experimentList: DataStore.getExperimentList(),
    experiment: DataStore.getExperiment(),
    history: DataStore.getHistory(),
    settings: DataStore.getSettings(),
    loading: DataStore.getLoading(),
    playback: DataStore.getPlayback()
  };
}

class AppContainer extends React.Component {
  constructor() {
    super();

    this.state = getStateFromStore();

    // Need to bind this to callback functions here
    this.onDataChange = this.onDataChange.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  componentDidMount() {
    DataStore.addChangeListener(this.onDataChange);

    // Bootstrap the application by getting the experiment list here
    ViewActionCreators.getExperimentList();

    // Initialize dropdown menu
    $(".dropdown-toggle").dropdown();
  }

  componentWillUnmount() {
    DataStore.removeChangeListener(this.onDataChange);
  }

  onDataChange() {
    this.setState(getStateFromStore());
  }

  onResize() {
    this.forceUpdate();
  }

  render() {
    return (
      <div className="container-fluid">
        <MainSection {...this.state} />
        <ResizeContainer onResize={this.onResize} />
      </div>
    );
  }
}

module.exports = AppContainer;
