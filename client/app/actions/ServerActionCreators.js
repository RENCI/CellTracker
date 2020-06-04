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

export function receiveExperimentInfo(experiment) {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_EXPERIMENT_INFO,
    experiment: experiment
  });
};

export function experimentLocked(info) {
  AppDispatcher.dispatch({
    actionType: Constants.EXPERIMENT_LOCKED,
    info: info
  });
}

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

export function receiveScore(totalScore, timeStamp) {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_SCORE,
    totalScore: totalScore,
    timeStamp: timeStamp
  });
}

export function receiveAllUserInfo(info) {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_ALL_USER_INFO,
    info: info
  });
}