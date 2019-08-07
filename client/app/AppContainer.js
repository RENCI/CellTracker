import React, { useState, useEffect } from 'react';
import MainSection from "./components/MainSection";
import ResizeListener from "./components/ResizeListener";
import DataStore from "./stores/DataStore";
import { getExperimentList } from "./actions/ViewActionCreators";

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

const AppContainer = () => {
  const [state, setState] = useState(getStateFromStore());
  const [, forceUpdate] = useState([]);

  const onDataChange = () => {
    setState(getStateFromStore());
  };

  const onResize = () => {
    forceUpdate([]);
  }

  useEffect(() => {
    DataStore.addChangeListener(onDataChange);

    // Bootstrap the application by getting the experiment list here
    getExperimentList();

    // Initialize dropdown menu
    $(".dropdown-toggle").dropdown();

    return () => {
      DataStore.removeChangeListener(onDataChange);
    }
  }, []);

  return (
    <div className="container-fluid">
      <MainSection {...state} />
      <ResizeListener onResize={onResize} />
    </div>
  );
}

export default AppContainer;
