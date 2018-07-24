var keyMirror = require("keymirror");

module.exports = keyMirror({
  RECEIVE_EXPERIMENT_LIST: null,
  RECEIVE_EXPERIMENT: null,

  UPDATE_LOADING: null,

  STOP_PLAY: null,
  TOGGLE_PLAY: null,
  SET_FRAME: null,
  FRAME_BACK: null,
  FRAME_FORWARD: null,

  // XXX: Maybe use PLAY_FROM and STOP_AT to combine play/pause and frame number?

  ADD_TRACE: null,
  UPDATE_TRACE: null,
  SELECT_TRACE: null
});
