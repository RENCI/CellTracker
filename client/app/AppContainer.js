import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import MainSection from "./components/MainSection";
import ResizeListener from "./components/ResizeListener";
import DataStore from "./stores/DataStore";
import { getUserInfo, getExperimentList, keyPress, getRegionScore } from "./actions/ViewActionCreators";

function getStateFromStore() {
  return {
    userInfo: DataStore.getUserInfo(),
    experimentList: DataStore.getExperimentList(),
    experiment: DataStore.getExperiment(),
    history: DataStore.getHistory(),
    settings: DataStore.getSettings(),
    loading: DataStore.getLoading(),
    playback: DataStore.getPlayback()
  };
}

// Store some state here to make it more accessible from keypress callbacks
let ctrlDown = false;
let experiment = null;
let playback = null;

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

    experiment = DataStore.getExperiment();
    playback = DataStore.getPlayback();
  };

  useEffect(() => {
    DataStore.addChangeListener(onDataChange);

    // Bootstrap the application by getting the user and experiment list here
    getUserInfo();
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
    switch (event.key) {
      case "Control":
        ctrlDown = false;
        break;

      case "0": {
        if (experiment && experiment.segmentationData && playback) {
          const frame = playback.frame;
          const currentRegion = experiment.segmentationData[frame].regions.filter(region => region.highlight);

          if (currentRegion.length === 1) {
            getRegionScore(experiment.id, frame, currentRegion[0]);
          }
        }

        break;
      }

      default:
        keyPress(event.key, ctrlDown);
    }
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
