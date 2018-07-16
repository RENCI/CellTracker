var React = require("react");
var PropTypes = require("prop-types");
var TraceSketchWrapper = require("../p5/TraceSketchWrapper");

function MainSection(props) {
  return (
    <div className="row">
      <div className="col-md-2">
        <button className="btn btn-default btn-block">Save Traces</button>
      </div>
      <div className="col-md-10 text-center" id="sketchDiv">
        <TraceSketchWrapper />
      </div>
    </div>
  );
}

MainSection.propTypes = {
};

module.exports = MainSection;
