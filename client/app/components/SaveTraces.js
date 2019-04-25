import React from "react";
import PropTypes from "prop-types";

const SaveTraces = props => {
  return (
    <div className="card">
      <h6 className="card-header">
        Save Traces
      </h6>
      <div className="card-body pb-1">
        <div className="form-group">
          <button
            type="button"
            className="btn btn btn-outline-secondary btn-block"
            onClick={props.onSaveTracesClick}>
              Save
          </button>
        </div>
      </div>
    </div>
  );
}

SaveTraces.propTypes = {
  onSaveTracesClick: PropTypes.func.isRequired
};

export default SaveTraces;
