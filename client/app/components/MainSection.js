var React = require("react");
var PropTypes = require("prop-types");
var Controls = require("./Controls");
var TraceSketchWrapper = require("../p5/TraceSketchWrapper");

function MainSection(props) {
  return (
    <div className="row">
      <div className="col-md-2">
        <Controls {...props} />
      </div>
      <div className="col-md-10 text-center" id="sketchDiv">
        <TraceSketchWrapper experiment={props.experiment} />
      </div>
    </div>
  );
}

MainSection.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object.isRequired
};

module.exports = MainSection;
