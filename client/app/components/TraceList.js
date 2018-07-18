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
    <div className="panel panel-default">
      <div className="panel-heading">
        Traces
      </div>
      <div className="panel-body">
        {widgets}
      </div>
      <div className="panel-footer text-right">
        <button
          type="button"
          className="btn btn-default btn-xs"
          onClick={onAddTraceClick}>
            <span className="glyphicon glyphicon-plus"></span>
        </button>
      </div>
    </div>
  );
}

TraceList.propTypes = {
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

module.exports = TraceList;
