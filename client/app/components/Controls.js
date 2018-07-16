var React = require("react");
var PropTypes = require("prop-types");

function Controls(props) {
  return (
    <div>
      <select className="form-control">
        <option>Hello</option>
      </select>
      <button className="btn btn-default btn-block">Save Tracking Data</button>
    </div>
  );
}

Controls.propTypes = {
};

module.exports = Controls;
