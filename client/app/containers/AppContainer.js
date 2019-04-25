import React, { Component } from 'react';
import MainSection from "../components/MainSection";
import ResizeContainer from "./ResizeContainer";
import DataStore from "../stores/DataStore";
import { getExperimentList } from "../actions/ViewActionCreators";

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

class AppContainer extends Component {
  constructor(props) {
    super(props);

    this.state = getStateFromStore();

    // Need to bind this to callback functions here
    this.onDataChange = this.onDataChange.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  componentDidMount() {
    DataStore.addChangeListener(this.onDataChange);

    // Bootstrap the application by getting the experiment list here
    getExperimentList();

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

export default AppContainer;
