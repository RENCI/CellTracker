import AppDispatcher from "../dispatcher/AppDispatcher";
import Constants from "../constants/Constants";

export const receiveExperimentList = experimentList => {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_EXPERIMENT_LIST,
    experimentList: experimentList
  });
};

export const receiveExperiment = experiment => {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_EXPERIMENT,
    experiment: experiment
  });
};

export const receiveFrame = (frame, image) => {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_FRAME,
    frame: frame,
    image: image
  });
};

export const receiveSegmentationFrame = (frame, segmentations) => {
  AppDispatcher.dispatch({
    actionType: Constants.RECEIVE_SEGMENTATION_FRAME,
    frame: frame,
    segmentations: segmentations
  });
};

export const updateTracking = trackingData => {
  AppDispatcher.dispatch({
    actionType: Constants.UPDATE_TRACKING,
    trackingData: trackingData
  });
};
