import AppDispatcher from "../dispatcher/AppDispatcher";
import Constants from "../constants/Constants";
import * as WebAPIUtils from "../utils/WebAPIUtils";
import DataStore from "../stores/DataStore";

export function getUserInfo() {
  WebAPIUtils.getUserInfo();
};

export function getExperimentList() {
  WebAPIUtils.getExperimentList();
};

export function selectExperiment(experiment) {
  AppDispatcher.dispatch({
    actionType: Constants.SELECT_EXPERIMENT,
    experiment: experiment
  });

  //WebAPIUtils.getExperimentInfo(experiment);
  //WebAPIUtils.getExperimentList();
};

export function loadFrames(startFrame) {
  AppDispatcher.dispatch({
    actionType: Constants.LOAD_FRAMES,
    startFrame: startFrame
  });

  console.log(DataStore.getExperiment());

  //WebAPIUtils.getFrames(DataStore.getExperiment());
};

export function expandForward() {
  AppDispatcher.dispatch({
    actionType: Constants.EXPAND_FORWARD
  });

  WebAPIUtils.getFrames(DataStore.getExperiment());
};
  
export function expandBackward() {
  AppDispatcher.dispatch({
    actionType: Constants.EXPAND_BACKWARD
  });

  WebAPIUtils.getFrames(DataStore.getExperiment());
};

export function cycleLoop() {
  AppDispatcher.dispatch({
    actionType: Constants.CYCLE_LOOP
  });
};

export function skipBackward() {
  AppDispatcher.dispatch({
    actionType: Constants.SKIP_BACKWARD
  });
};

export function togglePlay() {
  AppDispatcher.dispatch({
    actionType: Constants.TOGGLE_PLAY
  });
};

export function skipForward() {
  AppDispatcher.dispatch({
    actionType: Constants.SKIP_FORWARD
  });
};

export function setFrame(frame) {
  AppDispatcher.dispatch({
    actionType: Constants.SET_FRAME,
    frame: frame
  });
};

export function frameDelta(delta) {
  AppDispatcher.dispatch({
    actionType: Constants.FRAME_DELTA,
    delta: delta
  });
};

export function fastForward() {
  AppDispatcher.dispatch({
    actionType: Constants.FAST_FORWARD
  });
};

export function selectFrameRate(frameRate) {
  AppDispatcher.dispatch({
    actionType: Constants.SELECT_FRAME_RATE,
    frameRate: frameRate
  });
};

export function highlightRegion(frame, region) {
  AppDispatcher.dispatch({
    actionType: Constants.HIGHLIGHT_REGION,
    frame: frame,
    region: region
  });
};

export function selectRegion(frame, region) {
  AppDispatcher.dispatch({
    actionType: Constants.SELECT_REGION,
    frame: frame,
    region: region
  });
};

export function selectZoomPoint(frame, point) {
  AppDispatcher.dispatch({
    actionType: Constants.SELECT_ZOOM_POINT,
    frame: frame,
    point: point
  });
};

export function translate(point) {
  AppDispatcher.dispatch({
    actionType: Constants.TRANSLATE,
    point: point
  });
};

export function editRegion(frame, region) {
  AppDispatcher.dispatch({
    actionType: Constants.EDIT_REGION,
    frame: frame,
    region: region
  });
};

export function linkRegion(frame, region) {
  AppDispatcher.dispatch({
    actionType: Constants.LINK_REGION,
    frame: frame,
    region: region
  });
};

export function regionDone(region, done) {
  AppDispatcher.dispatch({
    actionType: Constants.REGION_DONE,
    region: region,
    done: done
  });
};

export function saveSegmentationData(id, segmentationData, lastEdit) {
  if (segmentationData.filter(frame => frame.edited).length === 0) return;

  WebAPIUtils.saveSegmentationData(id, segmentationData, lastEdit);

  AppDispatcher.dispatch({
    actionType: Constants.SAVE_SEGMENTATION_DATA
  });
};

/*
export function getRegionScore(id, frame, region) {
  WebAPIUtils.getRegionScore(id, frame, region);
};
*/

export function undoHistory() {
  AppDispatcher.dispatch({
    actionType: Constants.UNDO_HISTORY
  });
};

export function redoHistory() {
  AppDispatcher.dispatch({
    actionType: Constants.REDO_HISTORY
  });
};

export function toggleStabilize() {
  AppDispatcher.dispatch({
    actionType: Constants.TOGGLE_STABILIZE
  });
};

export function setFramesToLoad(framesToLoad) {
  AppDispatcher.dispatch({
    actionType: Constants.SET_FRAMES_TO_LOAD,
    framesToLoad: framesToLoad
  });
}

export function setFrameExpansion(frameExpansion) {
  AppDispatcher.dispatch({
    actionType: Constants.SET_FRAME_EXPANSION,
    frameExpansion: frameExpansion
  });
}

export function setDoneOpacity(doneOpacity) {
  AppDispatcher.dispatch({
    actionType: Constants.SET_DONE_OPACITY,
    doneOpacity: doneOpacity
  });
}

export function zoom(view, direction) {
  AppDispatcher.dispatch({
    actionType: Constants.ZOOM,
    view: view,
    direction: direction
  });
};

export function setEditMode(mode) {
  AppDispatcher.dispatch({
    actionType: Constants.SET_EDIT_MODE,
    mode: mode
  });
};

export function setCurrentLabel(label) {
  AppDispatcher.dispatch({
    actionType: Constants.SET_CURRENT_LABEL,
    label: label
  });
};

export function keyPress(key, ctrl) {
  AppDispatcher.dispatch({
    actionType: Constants.KEY_PRESS,
    key: key,
    ctrl: ctrl
  });
}