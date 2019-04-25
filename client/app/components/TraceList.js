import  React from "react";
import  PropTypes from "prop-types";
import  TraceWidget from "./TraceWidget";
import  ViewActionCreators from "../actions/ViewActionCreators";

function onAddTraceClick() {
  ViewActionCreators.addTrace();
}

const TraceList = props => {
  const widgets = props.traces.map(function (trace, i) {
    function handleClick() {
      ViewActionCreators.selectTrace(i);
    }

    return (
      <TraceWidget
        key={i}
        trace={trace}
        onClick={handleClick} />
    );
  });

  return (
    <div className="card mb-3">
      <h6 className="card-header">
        Traces
      </h6>
      <div className="card-body">
        {widgets}
      </div>
      <div className="card-footer text-right p-0">
        <button
          type="button"
          className="btn btn-light btn-sm"
          onClick={onAddTraceClick}>
            <span className="oi oi-plus"></span>
        </button>
      </div>
    </div>
  );
}

TraceList.propTypes = {
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default TraceList;
