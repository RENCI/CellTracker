var React = require("react");
var PropTypes = require("prop-types");
var DataControls = require("./DataControls");
var LoadingProgress = require("./LoadingProgress");
var PlaybackView = require("./PlaybackView");
var EditView = require("./EditView");

function MainSection(props) {
  var divClass = props.experiment && props.experiment.selectedRegion ?
      "col-md-12 text-center" :
      "offset-md-1 col-md-10 text-center";

  return (
    <div>
      <div className="row">
        <div className="offset-md-3 col-md-6">
          <DataControls {...props} />
        </div>
      </div>
      <div className="row">
        {props.experiment ?
          <div className={divClass}>
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
