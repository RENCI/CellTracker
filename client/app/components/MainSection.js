import React from "react";
import PropTypes from "prop-types";
import DataControls from "./DataControls";
import LoadingProgress from "./LoadingProgress";
import PlaybackView from "./PlaybackView";
import EditView from "./EditView";

const MainSection = props => {
  const edit = props.experiment && Number.isInteger(props.experiment.editFrame);

  const divClass = edit ?
      "col-md-12 text-center" :
      "offset-md-1 col-md-10 text-center";

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
                value1={props.loading.frame}
                max1={props.loading.numFrames}
                value2={props.loading.segFrame}
                max2={props.loading.numSegFrames} />
            : null}
            {props.loading === null ?
              edit ?
                <EditView {...props} /> :
                <PlaybackView {...props} />
            : null}
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
