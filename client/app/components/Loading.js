import React from "react";
import PropTypes from "prop-types";
import LoadingProgress from "./LoadingProgress";

const Loading = props => {
  return (
    <div>
      <LoadingProgress
        heading={"Loading " + props.experiment.name}
        subHeading={
          props.experiment.start ?
          ("Frames " + props.experiment.start + "-" + props.experiment.stop) : null
        }
        value1={props.loading.framesLoaded}
        max1={props.loading.numFrames}
        value2={props.loading.segFramesLoaded}
        max2={props.loading.numSegFrames} />
      <img src="static/ct_core/images/tracy_up.gif" />
    </div>
  );
}

Loading.propTypes = {
  experiment: PropTypes.object,
  loading: PropTypes.object
};

export default Loading;
