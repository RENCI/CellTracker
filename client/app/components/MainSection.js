import React from "react";
import PropTypes from "prop-types";
import DataControls from "./DataControls";
import Loading from "./Loading";
import EditView from "./EditView";

const MainSection = props => {
  const divClass = props.loading || (props.experiment && props.experiment.locked) ?
      "offset-md-2 col-md-8 text-center" :
      "col";

  return (
    <div>
      <div className="row">
        <div className="offset-md-2 col-md-8">
          <DataControls {...props} />
        </div>
      </div>
      <div className="row">
        {props.experiment && props.experiment.images ?
          <div className={divClass}>
            {props.experiment.locked ? 
              <div className="alert alert-danger">
                <p><strong>Error:</strong> Experiment locked by <strong>{props.experiment.locked_by}</strong></p>
                <p>Please select a different experiment</p>
              </div>
            :
              props.loading !== null ?
                <Loading {...props} />
              : <EditView {...props} />              
            }
          </div>
      : null}
      </div>
    </div>
  );
}

MainSection.propTypes = {
  userInfo: PropTypes.object,
  experimentList: PropTypes.object.isRequired,
  experiment: PropTypes.object,
  history: PropTypes.object,
  settings: PropTypes.object,
  loading: PropTypes.object,
  playback: PropTypes.object,
  width: PropTypes.number
};

export default MainSection;
