var React = require("react");
var PropTypes = require("prop-types");
var Controls = require("./Controls");
var TraceSketchWrapper = require("../p5/TraceSketchWrapper");
var ViewActionCreators = require("../actions/ViewActionCreators");

function handleUpdateTrace(points) {
  ViewActionCreators.updateTrace(points);
}

function MainSection(props) {
  return (
    <div className="row">
      <div className="col-md-2">
        <Controls {...props} />
      </div>
      <div className="col-md-10 text-center" id="sketchDiv">
        <TraceSketchWrapper
          experiment={props.experiment}
          traces={props.traces}
          onUpdateTrace={handleUpdateTrace} />
      </div>
    </div>
  );
}

MainSection.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object.isRequired,
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

module.exports = MainSection;
