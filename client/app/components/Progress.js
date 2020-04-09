import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

const Progress = props => {
  const totalRegions = props.experiment.segmentationData.reduce((total, current) => {
    return total + current.regions.length;
  }, 0);

  const doneRegions = props.experiment.segmentationData.reduce((total, current) => {
    return total + current.regions.filter(region => region.done).length;
  }, 0);

  const trajectories = new Set();
  const doneTrajectories = new Set();
  props.experiment.segmentationData.forEach(frame => {
    frame.regions.forEach(region => {
      trajectories.add(region.trajectory_id);

      if (region.done) doneTrajectories.add(region.trajectory_id);
    });
  });

  const percent = x => x * 100 + "%";

  const regionStyle = {
    width: percent(doneRegions / totalRegions)
  };

  const trajectoryStyle = {
    width: percent(doneTrajectories.size / trajectories.size)
  };

  return (
    <>    
      <h4>Progress</h4>
      <div>
        Regions: <small>{ doneRegions } of { totalRegions }</small>
        <div className="progress">
          <div className="progress-bar progress-bar-animated" style={regionStyle} />
        </div>
      </div>
      <div className="mt-4">
        Trajectories: <small>{ doneTrajectories.size } of { trajectories.size }</small>
        <div className="progress">
          <div className="progress-bar progress-bar-animated" style={trajectoryStyle} />
        </div>
      </div>
    </>
  );
}

Progress.propTypes = {
  experiment: PropTypes.object.isRequired
};

export default Progress;
