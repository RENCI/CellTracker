import * as d3 from "d3";
import { normalizeVector } from "../utils/MathUtils";
import { regionColors } from "../utils/ColorUtils";

export default function(sketch) {
  // Current experiment
  let experiment = null,
      allRegions = null;

  // Images
  let images = [],
      colorImages = [],
      frame = 0,
      lut = createLut(d3.interpolateInferno);

  // Interaction
  let onMouseWheel = null;

  // Segmentation
  let segmentationData = null,
      strokeColorMap = d3.scaleOrdinal(regionColors.map(c => {
        const color = d3.color(c);
        color.opacity = 0.75;
        return color.toString();
      })),
      fillColorMap = d3.scaleOrdinal(regionColors.map(c => {
        const color = d3.color(c);
        color.opacity = 0.75;
        return color.toString();
      }));

  // Callbacks
  let onSelectZoomPoint = null,
      onTranslate = null;

   // Editing
  let moveMouse = false,
      // XXX: Need to keep the previous mouse position because mouse moved is firing on mouse pressed
      oldMouseX = -1, oldMouseY = -1,
      dragStartX = -1, dragStartY = -1,
      dragPointX = -1, dragPointY = -1;

  // Settings
  let stabilize = true,
      highlightRegion = null;

  // Transform
  let zoom = 1,
      zoomPoint = null,
      translation = [0, 0];

  // Appearance
  let lineWeight = 2,
      lineHighlightWeight = 3;

  sketch.setup = function() {
    // Create canvas with default size
    var canvas = sketch.createCanvas(100, 100);
    canvas.mousePressed(mousePressed);
    canvas.mouseReleased(mouseReleased);
    canvas.mouseMoved(mouseMoved);
    canvas.mouseWheel(mouseWheel);
    sketch.noLoop();

    sketch.canvas.getContext("2d").imageSmoothingEnabled = false;
  }

  sketch.resize = function() {
    resize();
  }

  sketch.updateProps = function(props) {
    // Set props
    frame = props.frame;
    zoom = props.zoom;
    zoomPoint = props.zoomPoint;
    stabilize = props.stabilize;
    highlightRegion = props.highlightRegion;
    onMouseWheel = props.onMouseWheel;
    onSelectZoomPoint = props.onSelectZoomPoint;
    onTranslate = props.onTranslate;
  
    // Image smoothing
    //sketch.canvas.getContext("2d").imageSmoothingEnabled = true;

    // Check for new experiment
    if (!experiment || experiment.id !== props.experiment.id) {
      experiment = props.experiment;

      images = experiment.images.map(function(d) {
        const w = d.width,
            h = d.height,
            im = sketch.createImage(w, h);

        im.copy(d, 0, 0, w, h, 0, 0, w, h);

        return im;
      });

      processImages();
      resize();
    }

    segmentationData = experiment && experiment.segmentationData ? experiment.segmentationData : null;

    if (segmentationData) {
      segmentationData = experiment.segmentationData;

      let trajectories = new Set();

      // Update color map domain
      // XXX: Could move to DataStore and share same color map
      segmentationData.forEach(frame => {
        frame.regions.forEach(region => {
          trajectories.add(region.trajectory_id);
        });
      });

      trajectories = Array.from(trajectories).sort();

      strokeColorMap.domain(trajectories);
      fillColorMap.domain(trajectories);
    }

    allRegions = segmentationData ? segmentationData[frame].regions : null;

//    sketch.redraw();

    resize();
  }

  sketch.windowResized = function() {
    resize();
  }

  sketch.draw = function() {
    if (images.length === 0) {
      sketch.clear();
      return;
    }

    // Get image
    const im = colorImages[frame];

    // Get regions    
    const regions = allRegions;

    // Set scale and translation
    let p = null;

    if (allRegions && experiment.centerRegion && stabilize) {
      // Try to center on trajectory
      const id = experiment.centerRegion.trajectory_id;
      const i = regions.map(region => region.trajectory_id).indexOf(id);

      if (i !== -1) {
        p = scalePoint(regions[i].center);
        translation = [sketch.width / 2 / zoom - p[0], sketch.height / 2 / zoom - p[1]];
      }
    }

    if (!p && zoomPoint) {
      // Center on zoom point
      p = scalePoint(zoomPoint);
    }

    translation = p ? [sketch.width / 2 / zoom - p[0], sketch.height / 2 / zoom - p[1]] : [0, 0];

    sketch.scale(zoom);
    sketch.translate(translation[0], translation[1]);

    // Clear the background
    sketch.background(127, 127, 127);

    // Draw the image
    sketch.push();
    sketch.scale(sketch.width / im.width);
    sketch.image(im, 0, 0);
    sketch.pop();

    // Draw segmentation data
    const lineBackground = 0;

    sketch.strokeJoin(sketch.ROUND);

    if (allRegions) {
      const trajectoryId = highlightRegion ? highlightRegion.trajectory_id : null;

      allRegions.filter(region => region.trajectory_id === trajectoryId).forEach(region => {
        if (region.vertices.length < 1) return;

        const weight = lineHighlightWeight / zoom;

        const closedVertices = region.vertices.concat([region.vertices[0]]);

        sketch.push();

        // Draw outline background
        sketch.stroke(lineBackground);
        sketch.strokeWeight(weight + 1 / zoom);
        sketch.noFill();

        sketch.beginShape();
        closedVertices.forEach(vertex => {
          const v = scalePoint(vertex);
          sketch.vertex(v[0], v[1]);
        });
        sketch.endShape();

        // Draw outline
        sketch.stroke(strokeColorMap(region.trajectory_id));
        sketch.strokeWeight(weight);        

        //if (region.edited) sketch.fill(fillColorMap(region.trajectory_id));
        //else sketch.noFill();
        //if (region.highlight) sketch.noFill();
        //else sketch.fill(fillColorMap(region.trajectory_id));
        sketch.noFill();
        //if (editMode === "filmstrip" && region.highlight) sketch.fill(fillColorMap(region.trajectory_id));
        //else sketch.noFill();

        sketch.beginShape();
        closedVertices.forEach(vertex => {
          const v = scalePoint(vertex);
          sketch.vertex(v[0], v[1]);
        });
        sketch.endShape();        

        // Draw highlight outline
        if (region.highlight) {
          sketch.strokeWeight(lineWeight / zoom);        
          sketch.canvas.getContext("2d").setLineDash([3 / zoom, 3 / zoom]);

          sketch.beginShape();
          closedVertices.forEach(vertex => {
            const offset = normalizeVector([vertex[0] - region.center[0], vertex[1] - region.center[1]]);
            offset[0] *= 0.075 / zoom;
            offset[1] *= 0.075 / zoom;
            const v = scalePoint([vertex[0] + offset[0], vertex[1] + offset[1]]);
            sketch.vertex(v[0], v[1]);
          });
          sketch.endShape();             
        }
      
        sketch.pop();
      });
    }
  }

  function mousePressed(e) {
    e.preventDefault();

    if (sketch.mouseButton && sketch.mouseButton !== sketch.LEFT) return;

    // Save mouse position
    oldMouseX = sketch.mouseX;
    oldMouseY = sketch.mouseY;
    moveMouse = false;

    dragStartX = sketch.mouseX;
    dragStartY = sketch.mouseY;

    dragPointX = zoomPoint[0];
    dragPointY = zoomPoint[1];
  }

  function mouseMoved(e) {
    e.preventDefault();

    if (sketch.mouseButton && sketch.mouseButton !== sketch.LEFT) return;

    // Check mouse position
    if (sketch.mouseX === oldMouseX && sketch.mouseY === oldMouseY) return;
    oldMouseX = sketch.mouseX;
    oldMouseY = sketch.mouseY;
    moveMouse = true;

    if (sketch.mouseIsPressed) {
      const m = [sketch.mouseX, sketch.mouseY];
      let v = [m[0] - dragStartX, m[1] - dragStartY];
      v = normalizePoint([v[0] / zoom, v[1] / zoom]);
      const p = [dragPointX - v[0], dragPointY - v[1]];

      onTranslate(p);
    }
  }

  function mouseReleased(e) {
    e.preventDefault();

    if (sketch.mouseButton !== sketch.LEFT) return;

    if (!moveMouse && onSelectZoomPoint) {
      onSelectZoomPoint(frame, normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY])));  
    }
  }

  function mouseWheel(e) {
    e.preventDefault();

    if (onMouseWheel) {
      onMouseWheel(Math.round(-e.deltaY / 100));
    }

    return false;
  }

  function createLut(colors) {
    var colorScale = d3.scaleSequential(colors),
        lut = [];

    for (var i = 0; i < 256; i++) {
      var c = sketch.color(colorScale(i / 255));

      lut[i] = [
        sketch.red(c),
        sketch.green(c),
        sketch.blue(c)
      ];
    }

    return lut;
  }

  function processImages() {
/*
    colorImages = images.map(function(im) {
      var colorIm = sketch.createImage(im.width, im.height);

      im.loadPixels();
      colorIm.loadPixels();

      for (var x = 0; x < im.width; x++) {
        for (var y = 0; y < im.height; y++ ) {
          var i = (x + y * im.width) * 4,
              c = lut[im.pixels[i]];

          colorIm.pixels[i] = c[0];
          colorIm.pixels[i + 1] = c[1];
          colorIm.pixels[i + 2] = c[2];
          colorIm.pixels[i + 3] = 255;
        }
      }

      colorIm.updatePixels();

      return colorIm;
    });
*/
    colorImages = images.slice();   
  }

  function resize() {
    if (images.length === 0) return;

    // Size canvas to image aspect ratio
    const im = images[0],
          aspect = im.width / im.height,
          w = innerWidth(sketch._userNode),
          h = w / aspect;

    sketch.resizeCanvas(w, h);    
  }

  function innerWidth(element) {
    return element.clientWidth;
  }

  function applyZoom(p) {
    var x = p[0] - translation[0] * zoom;
    x /= zoom;

    var y = p[1] - translation[1] * zoom;
    y /= zoom;

    return [x, y];
  }

  function normalizePoint(p) {
    return [p[0] / sketch.width, p[1] / sketch.height];
  }

  function scalePoint(p) {
    return [p[0] * sketch.width, p[1] * sketch.height];
  }
}
