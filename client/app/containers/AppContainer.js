// Controller-view for the application that stores the current dataset

var React = require("react");
var HeaderSection = require("../components/HeaderSection");
var MainSection = require("../components/MainSection");
var DataStore = require("../stores/DataStore");
var ViewActionCreators = require("../actions/ViewActionCreators");

function getStateFromStore() {
  return {
    experimentList: DataStore.getExperimentList(),
    experiment: DataStore.getExperiment(),
    loading: DataStore.getLoading(),
    play: DataStore.getPlay(),
    frame: DataStore.getFrame(),
    frameRate: DataStore.getFrameRate(),
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

  componentDidUpdate() {
    if (this.state.experimentList.length > 0 && !this.state.experiment) {
      // Get the first experiment
      ViewActionCreators.selectExperiment(this.state.experimentList[0].id);
    }
  }

  onDataChange() {
    var newState = getStateFromStore();

    if (newState.experiment) {
      if ((!this.state.experiment || this.state.experiment.id !== newState.experiment.id) &&
          newState.experiment.hasSegmentation) {
        ViewActionCreators.getSegmentationData(newState.experiment.id);
      }
    }

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
