var React = require("react");
var PropTypes = require("prop-types");

function Controls(props) {
  return (
    <div>
      <div className="form-group">
        <label htmlFor="experimentSelect">Experiment</label>
        <select id="experimentSelect" className="form-control">
          <option>Hello</option>
        </select>
      </div>
      <button className="btn btn-default btn-block">Save Tracking Data</button>
    </div>
  );
}

Controls.propTypes = {
};

module.exports = Controls;
