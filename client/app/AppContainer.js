import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import MainSection from "./components/MainSection";
import Leaderboard from "./components/Leaderboard";
import ResizeListener from "./components/ResizeListener";
import DataStore from "./stores/DataStore";
import { 
  getUserInfo, 
  getAllUserInfo,
  getExperimentList, 
  keyPress, 
  saveSegmentationData 
} from "./actions/ViewActionCreators";

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

const AppContainer = () => {
  const [state, setState] = useState(getStateFromStore());
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState("home");
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
/*
      case "0": {
        if (experiment && experiment.segmentationData && playback) {
          const currentRegion = experiment.segmentationData[playback.frame].regions.filter(region => region.highlight);

          if (currentRegion.length === 1) {
            const frame = experiment.start + playback.frame;
            
            getRegionScore(experiment.id, frame, currentRegion[0]);
          }
        }

        break;
      }
*/    
      case " ":
        saveSegmentationData(
          experiment.id,
          experiment.segmentationData,
          experiment.lastEdit
        );
        break;  

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

  const onNavClick = value => {
    setPage(value);
  };

  return (
    <div ref={ref}>
      <ul className="nav nav-pills justify-content-center mb-3">
        <li className="nav-item">
          <a 
            className={ "nav-link" + (page === "home" ? " active" : "") } 
            href="#" 
            onClick={ () => onNavClick("home") }>
              Home
          </a>
        </li>
        <li className="nav-item">
        <a 
            className={ "nav-link" + (page === "leaderboard" ? " active" : "") } 
            href="#" 
            onClick={ () => onNavClick("leaderboard") }>
              Leaderboard
          </a>
        </li>
      </ul>
      <div className="container-fluid" style={{width: width}}>   
        { page === "leaderboard" ? 
          <Leaderboard {...state} />
        : <MainSection {...state} width={width} /> }
      </div>
      <ResizeListener onResize={onResize} />
    </div>
  );
}

export default AppContainer;
