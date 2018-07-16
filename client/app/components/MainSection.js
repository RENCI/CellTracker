var React = require("react");
var PropTypes = require("prop-types");
var Controls = require("./Controls");
var TraceSketchWrapper = require("../p5/TraceSketchWrapper");

function MainSection(props) {
  return (
    <div className="row">
      <div className="col-md-2">
        <Controls />
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
