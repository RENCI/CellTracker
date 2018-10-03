var keyMirror = require("keymirror");

module.exports = keyMirror({
  RECEIVE_EXPERIMENT_LIST: null,
  RECEIVE_EXPERIMENT: null,
  RECEIVE_FRAME: null,
  RECEIVE_SEGMENTATION_FRAME: null,

  STOP_PLAY: null,
  TOGGLE_PLAY: null,
  SET_FRAME: null,
  FRAME_DELTA: null,
  FAST_FORWARD: null,
  SELECT_FRAME_RATE: null,

  SELECT_REGION: null,

  ADD_TRACE: null,
  UPDATE_TRACE: null,
  SELECT_TRACE: null
});
