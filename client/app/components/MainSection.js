var React = require("react");
var PropTypes = require("prop-types");

function MainSection(props) {
  return (
    <div className="row">
      <div className="col-md-2">
        <button className="btn btn-default btn-block">Save Traces</button>
      </div>
      <div className="col-md-10 text-center" id="sketchDiv">
        <h2>p5 here</h2>
      </div>
    </div>
  );
}

MainSection.propTypes = {
};

module.exports = MainSection;
