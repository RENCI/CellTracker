import AppDispatcher from "../dispatcher/AppDispatcher";
import Constants from "../constants/Constants";
import * as WebAPIUtils from "../utils/WebAPIUtils";
import DataStore from "../stores/DataStore";

export const getExperimentList = () => {
  WebAPIUtils.getExperimentList();
};

export const selectExperiment = experiment => {
  AppDispatcher.dispatch({
    actionType: Constants.SELECT_EXPERIMENT,
    experiment: experiment
  });

  WebAPIUtils.getExperimentInfo(experiment);
};

export const advanceFrames = () => {
  AppDispatcher.dispatch({
    actionType: Constants.ADVANCE_FRAMES
  });

  WebAPIUtils.getFrames(DataStore.getExperiment());
};
  
export const reverseFrames = () => {
  AppDispatcher.dispatch({
    actionType: Constants.REVERSE_FRAMES
  });

  WebAPIUtils.getFrames(DataStore.getExperiment());
};

export const cycleLoop = () => {
  AppDispatcher.dispatch({
    actionType: Constants.CYCLE_LOOP
  });
};

export const skipBackward = () => {
  AppDispatcher.dispatch({
    actionType: Constants.SKIP_BACKWARD
  });
};

export const togglePlay = () => {
  AppDispatcher.dispatch({
    actionType: Constants.TOGGLE_PLAY
  });
};

export const skipForward = () => {
  AppDispatcher.dispatch({
    actionType: Constants.SKIP_FORWARD
  });
};

export const setFrame = frame => {
  AppDispatcher.dispatch({
    actionType: Constants.SET_FRAME,
    frame: frame
  });
};

export const frameDelta = delta => {
  AppDispatcher.dispatch({
    actionType: Constants.FRAME_DELTA,
    delta: delta
  });
};

export const fastForward = () => {
  AppDispatcher.dispatch({
    actionType: Constants.FAST_FORWARD
  });
};

export const selectFrameRate = frameRate => {
  AppDispatcher.dispatch({
    actionType: Constants.SELECT_FRAME_RATE,
    frameRate: frameRate
  });
};

export const highlightRegion = (frame, region) => {
  AppDispatcher.dispatch({
    actionType: Constants.HIGHLIGHT_REGION,
    frame: frame,
    region: region
  });
};

export const selectRegion = (frame, region) => {
  AppDispatcher.dispatch({
    actionType: Constants.SELECT_REGION,
    frame: frame,
    region: region
  });
};

export const selectZoomPoint = (frame, point) => {
  AppDispatcher.dispatch({
    actionType: Constants.SELECT_ZOOM_POINT,
    frame: frame,
    point: point
  });
};

export const editRegion = (frame, region) => {
  AppDispatcher.dispatch({
    actionType: Constants.EDIT_REGION,
    frame: frame,
    region: region
  });
};

export const saveSegmentationData = (id, segmentationData) => {
  WebAPIUtils.saveSegmentationData(id, segmentationData);

  AppDispatcher.dispatch({
    actionType: Constants.SAVE_SEGMENTATION_DATA
  });
};

export const undoHistory = () => {
  AppDispatcher.dispatch({
    actionType: Constants.UNDO_HISTORY
  });
};

export const redoHistory = () => {
  AppDispatcher.dispatch({
    actionType: Constants.REDO_HISTORY
  });
};

export const toggleStabilize = () => {
  AppDispatcher.dispatch({
    actionType: Constants.TOGGLE_STABILIZE
  });
};

export const zoom = (view, direction) => {
  AppDispatcher.dispatch({
    actionType: Constants.ZOOM,
    view: view,
    direction: direction
  });
};

export const setEditMode = mode => {
  AppDispatcher.dispatch({
    actionType: Constants.SET_EDIT_MODE,
    mode: mode
  });
};
