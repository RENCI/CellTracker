import React from "react";
import PropTypes from "prop-types";
import EditSketch from "./EditSketch";
import FilmstripSketch from "./FilmstripSketch";

class TraceSketchWrapper extends React.Component {
  constructor() {
    super();

    this.sketch = null;
    this.ref = React.createRef();
  }

  componentDidMount() {
    this.sketch = this.props.editMode === null ? 
      new p5(FilmstripSketch, this.ref.current) :
      new p5(EditSketch, this.ref.current);

    this.sketch.updateProps(this.props);
  }

  shouldComponentUpdate(props, state) {
    this.sketch.updateProps(props);

    return false;
  }

  componentWillUnmount() {
    this.sketch.remove();
    this.sketch = null;
  }

  render() {
    return <div ref={this.ref} />
  }
}

TraceSketchWrapper.propTypes = {
  experiment: PropTypes.object.isRequired,
  zoom: PropTypes.number,
  zoomPoint: PropTypes.arrayOf(PropTypes.number),
  frame: PropTypes.number.isRequired,
  editMode: PropTypes.string,
  stabilize: PropTypes.bool,
  highlightRegion: PropTypes.object,
  currentLabel: PropTypes.string,
  doneOpacity: PropTypes.number,
  onMouseWheel: PropTypes.func.isRequired,
  onHighlightRegion: PropTypes.func,
  onSelectRegion: PropTypes.func,
  onSelectZoomPoint: PropTypes.func.isRequired,
  onTranslate: PropTypes.func.isRequired,
  onEditRegion: PropTypes.func,
  onLinkRegion: PropTypes.func,
  onLabelRegion: PropTypes.func
};

TraceSketchWrapper.defaultProps = {
  zoom: 1,
  zoomPoint: null,
  editMode: null,
  stabilize: false,
  highlightRegion: null,
  currentLabel: "",
  onHighlightRegion: null,
  onSelectRegion: null,
  onEditRegion: null,
  onLinkRegion: null,
  onLabelRegion: null
};

export default TraceSketchWrapper;