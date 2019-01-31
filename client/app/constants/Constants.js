var keyMirror = require("keymirror");

module.exports = keyMirror({
  RECEIVE_EXPERIMENT_LIST: null,
  RECEIVE_EXPERIMENT: null,
  RECEIVE_FRAME: null,
  RECEIVE_SEGMENTATION_FRAME: null,

  CYCLE_LOOP: null,
  TOGGLE_PLAY: null,
  SKIP_BACKWARD: null,
  SKIP_FORWARD: null,
  SET_FRAME: null,
  FRAME_DELTA: null,
  FAST_FORWARD: null,
  SELECT_FRAME_RATE: null,

  SELECT_REGION: null,
  EDIT_REGION: null,
  SAVE_SEGMENTATION_DATA: null,

  ZOOM: null,
  SET_EDIT_MODE: null,

  ADD_TRACE: null,
  UPDATE_TRACE: null,
  SELECT_TRACE: null
});
