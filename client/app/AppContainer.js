import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import MainSection from "./components/MainSection";
import ResizeListener from "./components/ResizeListener";
import DataStore from "./stores/DataStore";
import { getExperimentList, keyPress } from "./actions/ViewActionCreators";

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

let ctrlDown = false;

const AppContainer = () => {
  const [state, setState] = useState(getStateFromStore());
  const [width, setWidth] = useState(0);
  const ref = useRef(null);

  const onResize = () => {
    // XXX: Hack to account for controls
    const yPad = 40;
    const w = ref.current.clientWidth;
    const h = window.innerHeight - yPad;

    // XXX: Hack assuming 2 x 8 x 2 column widths in EditView
    setWidth(Math.min(w, h * 4 / 3));
  }

  useLayoutEffect(onResize, [width]); 

  const onDataChange = () => {
    setState(getStateFromStore());
  };

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

  const onKeyDown = event => {
    if (event.key === "Control") ctrlDown = true;
  }

  const onKeyUp = event => {    
    if (event.key === "Control") ctrlDown = false;
    else keyPress(event.key, ctrlDown);
  }

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    }
  }, []);

  return (
    <div ref={ref}>
      <div className="container-fluid" style={{width: width}}>   
          <MainSection {...state} width={width} />
      </div>
      <ResizeListener onResize={onResize} />
    </div>
  );
}

export default AppContainer;
