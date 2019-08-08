import React from "react";
import PropTypes from "prop-types";
import DataControls from "./DataControls";
import LoadingProgress from "./LoadingProgress";
import EditView from "./EditView";

const MainSection = props => {
  const divClass = props.loading ?
      "offset-md-2 col-md-8 text-center" :
      "col-md-12";

  return (
    <div>
      <div className="row">
        <div className="offset-md-2 col-md-8">
          <DataControls {...props} />
        </div>
      </div>
      <div className="row">
        {props.experiment ?
          <div className={divClass}>
            {props.loading !== null ?
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
            : <EditView {...props} />
            }
          </div>
      : null}
      </div>
    </div>
  );
}

MainSection.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object,
  history: PropTypes.object,
  settings: PropTypes.object,
  loading: PropTypes.object,
  playback: PropTypes.object
};

export default MainSection;
