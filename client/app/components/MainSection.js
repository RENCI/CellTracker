var React = require("react");
var PropTypes = require("prop-types");
var Controls = require("./Controls");
var LoadingProgress = require("./LoadingProgress");
var PlaybackView = require("./PlaybackView");
var EditView = require("./EditView");

function MainSection(props) {
  return (
    <div className="row">
      <div className="col-md-2">
        <Controls {...props} />
      </div>
      {props.experiment ?
        <div className="col-md-10 text-center">
          {props.loading !== null ?
            <LoadingProgress
              label={"Loading " + props.experiment.name}
              value1={props.loading.image}
              maxValue1={props.loading.numImages}
              value2={props.loading.segmentation}
              maxValue2={props.loading.numSegmentation} />
          : null}
          {props.loading === null ?
            props.experiment.selectedRegion ?
              <EditView {...props} /> :
              <PlaybackView {...props} />
          : null}
        </div>
    : null}
    </div>
  );
}

MainSection.propTypes = {
  experimentList: PropTypes.arrayOf(PropTypes.object).isRequired,
  experiment: PropTypes.object,
  loading: PropTypes.object,
  playback: PropTypes.object,
  traces: PropTypes.arrayOf(PropTypes.object).isRequired
};

module.exports = MainSection;
