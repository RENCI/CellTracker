import AppDispatcher from "../dispatcher/AppDispatcher";
import Constants from "../constants/Constants";

export function receiveUserInfo(userInfo) {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_USER_INFO,
    userInfo: userInfo
  });
};

export function receiveExperimentList(experimentList) {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_EXPERIMENT_LIST,
    experimentList: experimentList
  });
};

export function receiveExperiment(experiment) {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_EXPERIMENT,
    experiment: experiment
  });
};

export function receiveFrame(frame, image) {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_FRAME,
    frame: frame,
    image: image
  });
};

export function receiveSegmentationFrame(frame, segmentations) {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_SEGMENTATION_FRAME,
    frame: frame,
    segmentations: segmentations
  });
};

export function updateTracking(trackingData) {
  AppDispatcher.dispatch({
    actionType: Constants.UPDATE_TRACKING,
    trackingData: trackingData
  });
};
