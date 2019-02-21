var d3Scale = require("d3-scale");
var d3ScaleChromatic = require("d3-scale-chromatic");
var d3Color = require("d3-color");
var MathUtils = require("../utils/MathUtils");
var RegionEditing = require("../utils/RegionEditing");

module.exports = function (sketch) {
  // Current experiment
  var experiment = null;

  // PNG or JPG
  var imageType = "jpg";

  // Images
  var images = [],
      colorImages = [],
      contrastImages = [],
      frame = 0,
      lut = createLut(d3ScaleChromatic.interpolateInferno),
      onUpdateLoading = null;

  // Interaction
  var onKeyPress = null,
      onMouseWheel = null;

  // Tracing
  var trace = false,
      traces = [],
      points = [],
      onUpdateTrace = null;

  // Segmentation
  var segmentationData = null,
      onSelectRegion = null,
      onEditRegion = null,
      regionColorMap = d3Scale.scaleOrdinal(d3ScaleChromatic.schemeCategory10.map(c => {
        let color = d3Color.color(c);
        color.opacity = 0.75;
        return color.toString();
      }));

  // Editing
  var editView = false,
      editMode = "playback",
      handle = null,
      currentRegion = null,
      mergeRegion = null,
      moveHandle = false,
      moveMouse = false,
      // XXX: Need to keep the previous mouse position because mouse moved is firing on mouse pressed
      oldMouseX = -1, oldMouseY = -1,
      splitLine = null;

  // Transform
  var zoom = 1,
      zoomPoint = null,
      translation = [0, 0];

  // Appearance
  var lineWeight = 1;
  var lineHighlightWeight = 2;
  var handleRadius = 2;
  var handleHighlightRadius = 5;

  sketch.setup = function() {
    // Create canvas with default size
    var canvas = sketch.createCanvas(100, 100);
    canvas.mousePressed(mousePressed);
    canvas.mouseReleased(mouseReleased);
    canvas.mouseMoved(mouseMoved);
    canvas.mouseWheel(mouseWheel);
    sketch.noLoop();
  }

  sketch.updateProps = function(props) {
    // Set props
    frame = props.frame;
    zoom = props.zoom;
    zoomPoint = props.zoomPoint;
    editMode = props.editMode;
    traces = props.traces;
    onKeyPress = props.onKeyPress;
    onMouseWheel = props.onMouseWheel;
    onSelectRegion = props.onSelectRegion;
    onEditRegion = props.onEditRegion;
    onUpdateTrace = props.onUpdateTrace;

    editView = editMode !== "playback";
    if (editMode !== "split" && editMode !== "trim") splitLine = null;

    // Check for new experiment
    if (!experiment || experiment.id !== props.experiment.id) {
      experiment = props.experiment;

      images = experiment.images.map(function(d) {
        var w = d.width,
            h = d.height,
            im = sketch.createImage(w, h);

        im.copy(d, 0, 0, w, h, 0, 0, w, h);

        return im;
      });

      resizeImages();
    }

    if (experiment) {
      segmentationData = experiment.segmentationData;
    }

    highlight();
    sketch.redraw();
  }

  sketch.windowResized = function() {
    resizeImages();
  }

  sketch.draw = function() {
    if (images.length === 0) {
      sketch.clear();
      return;
    }

//    if (!moveHandle) highlight();

    // Get image
    var im = colorImages[frame];
/*
    if (trace && frame > 0) {
      // Get normalized mouse position at end of last frame
      var p = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

      points.push([p[0], p[1], frame - 1]);
    }
*/

    // Set scale and translation
    translation = [0, 0];
    if (zoomPoint) {
      const p = scalePoint(zoomPoint);
      translation = [sketch.width / 2 / zoom - p[0], sketch.height / 2 / zoom - p[1]];
    }

    sketch.scale(zoom);
    sketch.translate(translation[0], translation[1]);

    // Clear the background
    sketch.background(127, 127, 127);

    // Draw the image
    sketch.image(im, 0, 0);

/*
    // Draw points for all traces
    sketch.stroke(0, 0, 0, 127);
    sketch.strokeWeight(1);
    sketch.fill(255, 255, 255, 127);
    traces.forEach(function (d) {
      // Check for a point at this frame
      var p = null;

      for (var i = 0; i < d.points.length; i++) {
        if (d.points[i][2] === frame) {
          p = d.points[i];
          break;
        }
      }

      if (p === null) return;

      var s = 10;
      var p2 = scalePoint(p);

      sketch.ellipse(p2[0], p2[1], s, s);
    });
*/

    // Draw segmentation data
    if (segmentationData) {
      segmentationData[frame].regions.forEach(function(region) {
        sketch.stroke(regionColorMap(region.id));

        let weight = region.highlight ? lineHighlightWeight : lineWeight;
        weight /= zoom;

        sketch.strokeWeight(weight);
        sketch.strokeJoin(sketch.ROUND);
        sketch.noFill();

        // Draw outline
        sketch.beginShape();
        region.vertices.forEach(function(vertex) {
          var v = scalePoint(vertex);
          sketch.vertex(v[0], v[1]);
        });
        if (region.vertices.length > 0) {
          var v = scalePoint(region.vertices[0]);
          sketch.vertex(v[0], v[1]);
        }
        sketch.endShape();

        if (editView) {
          // Draw points
          sketch.ellipseMode(sketch.RADIUS);
          sketch.fill(127, 127, 127);
          sketch.noStroke();

          var r = handleRadius / zoom;

          region.vertices.forEach(function(vertex, i) {
            var v = scalePoint(vertex);

            if (vertex === handle) {
              if (!moveHandle) {
                sketch.ellipse(v[0], v[1], handleHighlightRadius / zoom);
              }
            }
            else {
              sketch.ellipse(v[0], v[1], r);
            }
          });
        }
      });
    }

    if (splitLine) {
      sketch.stroke(255, 255, 255, 127);

      var weight = lineWeight / zoom;
      sketch.strokeWeight(weight);

      // Draw line
      var p1 = scalePoint(splitLine[0]);
      var p2 = scalePoint(splitLine[1]);
      sketch.line(p1[0], p1[1], p2[0], p2[1]);
    }
/*
    // Draw path for current trace
    sketch.strokeWeight(4);
    sketch.noFill();
    for (var i = 1; i < points.length; i++) {
      var p0 = points[i - 1],
          p1 = points[i],
          alpha = points.length === 2 ? 255 : sketch.map(i, 1, points.length - 1, 100, 255);

      sketch.stroke(127, 127, 127, alpha);

      sketch.line(p0[0] * maxX, p0[1] * maxY, p1[0] * maxX, p1[1] * maxY);
    }
*/
  }

  // XXX: Limit to events on the canvas?
  sketch.keyPressed = function(e) {
    e.preventDefault();

    onKeyPress(sketch.keyCode);
  }

  function mousePressed(e) {
    e.preventDefault();

    if (sketch.mouseButton !== sketch.LEFT) return;

    // Save mouse position
    oldMouseX = sketch.mouseX;
    oldMouseY = sketch.mouseY;
    moveMouse = false;

    if (editMode === "split" || editMode === "trim") {
      const m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

      splitLine = [
        [m[0], m[1]],
        [m[0], m[1]]
      ];
    }
  }

  function mouseMoved(e) {
    e.preventDefault();

    if (sketch.mouseButton && sketch.mouseButton !== sketch.LEFT) return;

    const regions = segmentationData[frame].regions;

    // Check mouse position
    if (sketch.mouseX === oldMouseX && sketch.mouseY === oldMouseY) return;
    oldMouseX = sketch.mouseX;
    oldMouseY = sketch.mouseY;
    moveMouse = true;

    switch (editMode) {
      case "playback":
      break;

      case "vertex":
        if (sketch.mouseIsPressed && handle) {
          moveHandle = true;
          sketch.noCursor();
        }

        if (moveHandle) {
          const m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));
          handle[0] = m[0];
          handle[1] = m[1];
        }

        break;

      case "merge":
      break;

      case "split":
      case "trim":
        if (sketch.mouseIsPressed) {
          const m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

          splitLine[1] = [m[0], m[1]];

          // Highlight based on intersections with split line
          regions.forEach(region => {
            region.highlight = regionLineSegmentIntersections(region, splitLine) === 2;
          });
        }

        break;

      case "regionEdit":
      case "regionSelect":
        break;
    }

    highlight();
    sketch.redraw();

    function regionLineSegmentIntersections(region, line) {
      let vertices = region.vertices;
      let intersections = 0;

      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i],
              v2 = vertices[i === vertices.length - 1 ? 0 : i + 1];

        const p = MathUtils.lineSegmentIntersection(line[0], line[1], v1, v2);

        if (p) intersections++;
      }

      return intersections;
    }
  }

  function mouseReleased(e) {
    e.preventDefault();

    if (sketch.mouseButton !== sketch.LEFT) return;

    const regions = segmentationData[frame].regions;

    switch (editMode) {
      case "playback":
        if (!moveMouse) {
          // Select segmentation region
          if (segmentationData) {
            if (currentRegion) {
              onSelectRegion(frame, currentRegion);
            }
            else {
              onSelectRegion();
            }
          }
        }

        break;

      case "vertex":
        if (!moveMouse) {
          if (handle) {
            if (RegionEditing.removeVertex(currentRegion, handle)) {
              onEditRegion(frame, currentRegion);
            }
          }
          else {
            // Add handle at mouse position
            RegionEditing.addVertex(currentRegion, normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY])));
            onEditRegion(frame, currentRegion);
          }
        }
        else {
          if (handle) {
            onEditRegion(frame, currentRegion);
          }
        }

        moveHandle = false;
        sketch.cursor(sketch.ARROW);

        break;

      case "merge":
        if (!moveMouse) {
          if (mergeRegion && currentRegion && mergeRegion !== currentRegion) {
            RegionEditing.mergeRegions(mergeRegion, currentRegion, 1.1 / images[0].width, regions);
            onEditRegion(frame, mergeRegion);
            mergeRegion = null;
          }
          else if (mergeRegion === currentRegion) {
            mergeRegion = null;
          }
          else {
            mergeRegion = currentRegion;
          }
        }

        break;

      case "split":
        if (splitLine) {
          regions.filter(region => region.highlight).forEach(region => {
            RegionEditing.splitRegion(region, splitLine, 0.5 / images[0].width, regions);
            onEditRegion(frame, region);
          });
        }

        splitLine = null;

        break;

      case "trim":
        if (splitLine) {
          regions.filter(region => region.highlight).forEach(region => {
            RegionEditing.trimRegion(region, splitLine);
            onEditRegion(frame, region);
          });
        }

        splitLine = null;

        break;

      case "regionEdit":
        if (moveMouse) return;

        if (currentRegion) {
          RegionEditing.removeRegion(currentRegion, regions);
          onEditRegion(frame, currentRegion);
        }
        else {
          const radius = regions.reduce((p, c) => {
            return p + c.max[0] - c.min[0];
          }, 0) / regions.length / 2;

          const newRegion = RegionEditing.addRegion(
            normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY])),
            radius, regions
          );

          onEditRegion(frame, newRegion);
          onSelectRegion(frame, newRegion);
        }

        break;

      case "regionSelect":
        if (moveMouse) return;

        if (currentRegion) {
          onSelectRegion(frame, currentRegion);
        }

        break;
    }

    highlight();
    sketch.redraw();

      // XXX: Below for tracing
  /*
      trace = !trace;

      sketch.cursor(trace ? sketch.CROSS : sketch.ARROW);

      if (trace) points = [];
      else onUpdateTrace(getTrace());

      return false;
  */
  }

  function mouseWheel(e) {
    e.preventDefault();

    onMouseWheel(Math.round(-e.deltaY / 100));

    return false;
  }

  function getTrace() {
    return points.slice();
  }

  function createLut(colors) {
    var colorScale = d3Scale.scaleSequential(colors),
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

  function resizeImages() {
    if (images.length === 0) return;

    // Size canvas to image aspect ratio
    var im = images[0],
        aspect = im.width / im.height,
        w = innerWidth(sketch._userNode),
        h = w / aspect;

    // Resize images
    images.forEach(function(im) {
      im.resize(w, h);
    });

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

    sketch.resizeCanvas(w, h);
  }

  function highlight() {
    if (sketch.mouseIsPressed) return;

    // Get mouse position
    const x = sketch.mouseX,
          y = sketch.mouseY;

    if (x < 0 || x >= sketch.width ||
        y < 0 || y >= sketch.height ||
        !segmentationData) return;

    // Mouse position
    const m = applyZoom([sketch.mouseX, sketch.mouseY]);

    // Clear highlighting
    handle = null;
    currentRegion = null;
    if (editMode !== "merge") mergeRegion = null;

    const regions = segmentationData[frame].regions;

    regions.forEach(function(region) {
      region.highlight = false;
    });

    if (mergeRegion) mergeRegion.highlight = true;

    sketch.cursor(sketch.ARROW);

    switch (editMode) {
      case "playback":
        if (zoom !== 1) {
          sketch.cursor(sketch.MOVE);
        }

      case "regionEdit":
      case "regionSelect":
      case "merge":
        // Test regions
        for (var i = 0; i < regions.length; i++) {
          const region = regions[i];

          if (MathUtils.insidePolygon(normalizePoint(m), region.vertices)) {
            currentRegion = region;
            region.highlight = true;

            sketch.cursor(sketch.HAND);

            break;
          }
        }

        break;

      case "vertex":
        sketch.cursor(sketch.CROSS);

        // Radius
        const r = handleHighlightRadius / zoom;

        // Find region with closest vertex
        let closestVertex = null;
        let closestDistance = null;
        regions.forEach(region => {
          region.vertices.forEach(vertex => {
            const p = scalePoint(vertex);
            const d = sketch.dist(m[0], m[1], p[0], p[1]);

            if (!closestDistance || d < closestDistance) {
              closestVertex = vertex;
              closestDistance = d;
              currentRegion = region;
            }
          });
        });

        currentRegion.highlight = true;

        if (closestDistance < r) {
          handle = closestVertex;
          sketch.cursor(sketch.HAND);
        }

        break;

      case "split":
        break;

      case "trim":
        break;
    }
  }

  function innerWidth(element) {
    var cs = getComputedStyle(element);

    var padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
        border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);

    return element.offsetWidth - padding - border;
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
