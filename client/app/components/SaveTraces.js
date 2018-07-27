var React = require("react");
var PropTypes = require("prop-types");

function SaveTraces(props) {
  return (
    <div>
      <div className="form-group">
        <label htmlFor="userNameInput">User name</label>
        <input
          type="text"
          id="userNameInput"
          className="form-control"
          placeholder="User name"
          value={props.userName === null ? "" : props.userName}
          onChange={props.onUserNameChange}/>
      </div>
      <div className="form-group">
        <button
          type="button"
          className="btn btn btn-outline-secondary btn-block"
          disabled={props.userName === null ? true : null}
          onClick={props.onSaveTracesClick}>
            Save Traces
        </button>
      </div>
    </div>
  );
}

SaveTraces.propTypes = {
  userName: PropTypes.string,
  onUserNameChange: PropTypes.func.isRequired,
  onSaveTracesClick: PropTypes.func.isRequired
};

module.exports = SaveTraces;
