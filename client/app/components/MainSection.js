var React = require("react");
var PropTypes = require("prop-types");
var DataControls = require("./DataControls");
var LoadingProgress = require("./LoadingProgress");
var PlaybackView = require("./PlaybackView");
var EditView = require("./EditView");

function MainSection(props) {
  const divClass = props.experiment && props.experiment.selectedRegion ?
      "col-md-12 text-center" :
      "offset-md-1 col-md-10 text-center";

  return (
    <div>
      <div className="row">
        <div className="offset-md-2 col-md-8">
          <DataControls {...props} />
        </div>
      </div>
      <div className="row">
        {props.experiment ?
          <div className={divClass}>
            {props.loading !== null ?
              <LoadingProgress
                heading={"Loading " + props.experiment.name}
                subHeading={
                  props.experiment.start ?
                  ("Frames " + props.experiment.start + "-" + props.experiment.stop) : null
                }
                value1={props.loading.frame}
                max1={props.loading.numFrames}
                value2={props.loading.segFrame}
                max2={props.loading.numSegFrames} />
            : null}
            {props.loading === null ?
              props.experiment.selectedRegion ?
                <EditView {...props} /> :
                <PlaybackView {...props} />
            : null}
          </div>
      : null}
      </div>
    </div>
  );
}

MainSection.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object,
  history: PropTypes.object,
  settings: PropTypes.object,
  loading: PropTypes.object,
  playback: PropTypes.object,
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

module.exports = MainSection;
