var React = require("react");
var PropTypes = require("prop-types");
var TraceWidget = require("./TraceWidget");
var ViewActionCreators = require("../actions/ViewActionCreators");

function onAddTraceClick() {
  ViewActionCreators.addTrace();
}

function TraceList(props) {
  var widgets = props.traces.map(function (trace, i) {
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

module.exports = TraceList;
