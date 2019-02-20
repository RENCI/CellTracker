var d3Scale = require("d3-scale");
var d3ScaleChromatic = require("d3-scale-chromatic");
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
      regionColors = ['rgb(166,206,227)','rgb(31,120,180)','rgb(178,223,138)','rgb(51,160,44)','rgb(251,154,153)','rgb(227,26,28)','rgb(253,191,111)','rgb(255,127,0)','rgb(202,178,214)','rgb(106,61,154)','rgb(255,255,153)','rgb(177,89,40)'],
      regionAlpha = 0.75,
      regionColorMap = null;

      // Add alpha to region colors, taken from color brewer
      regionColors = regionColors.map(function(d) {
        return d.replace("rgb", "rgba").replace(")", "," + regionAlpha + ")");
      });

  // Editing
  var editView = false;
  var editMode = "playback";
  var handle = null;
  var moveHandle = false;
  var moveMouse = false;
  // XXX: Need to keep the previous mouse position because mouse moved is firing on mouse pressed
  var oldMouseX = -1, oldMouseY = -1;
  var splitLine = null;

  // Transform
  var scale = 1;
  var translation = [0, 0];

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
    scale = props.zoom;
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
      updateRegionColorMap();
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
    if (segmentationData && experiment.selectedRegion) {
      var c = scalePoint(experiment.selectedRegion.region.center);

      translation = [sketch.width / 2 / scale - c[0], sketch.height / 2 / scale - c[1]];
    }

    sketch.scale(scale);
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
//        if (region.selected) sketch.stroke(203,24,29);
//        else sketch.stroke(127, 127, 127);
//        sketch.stroke(255, 255, 255, 127);
        sketch.stroke(regionColorMap[region.id]);

        var weight = region.highlight ? lineHighlightWeight : lineWeight;
        weight /= scale;

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

        if (editView && region.selected) {
          // Draw points
          sketch.ellipseMode(sketch.RADIUS);
          sketch.fill(127, 127, 127);
          sketch.noStroke();

          var r = handleRadius / scale;

          region.vertices.forEach(function(vertex, i) {
            var v = scalePoint(vertex);

            if (vertex === handle) {
              if (!moveHandle) {
                sketch.ellipse(v[0], v[1], handleHighlightRadius / scale);
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

      var weight = lineWeight / scale;
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
      var m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

      splitLine = [
        [m[0], m[1]],
        [m[0], m[1]]
      ];
    }
  }

  function mouseMoved(e) {
    e.preventDefault();

    if (sketch.mouseButton !== sketch.LEFT) return;

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
          var m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));
          handle[0] = m[0];
          handle[1] = m[1];
        }

        break;

      case "merge":
      break;

      case "split":
      case "trim":
        if (sketch.mouseIsPressed) {
          var m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

          splitLine[1] = [m[0], m[1]];
        }

        break;

      case "regionEdit":
      case "regionSelect":
        break;
    }

    highlight();
    sketch.redraw();
  }

  function mouseReleased(e) {
    e.preventDefault();

    if (sketch.mouseButton !== sketch.LEFT) return;

    var region = experiment.selectedRegion ? experiment.selectedRegion.region : null;

    var highlightRegion = segmentationData[frame].regions.filter(function(region) {
      return region.highlight;
    });
    highlightRegion = highlightRegion.length > 0 ? highlightRegion[0] : null;

    switch (editMode) {
      case "playback":
        if (!moveMouse) {
          // Select segmentation region
          if (segmentationData) {
            if (highlightRegion) {
              onSelectRegion(frame, highlightRegion);
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
            if (RegionEditing.removeVertex(region, handle)) {
              onEditRegion(frame, region);
            }
          }
          else {
            // Add handle at mouse position
            RegionEditing.addVertex(region, normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY])));
            onEditRegion(frame, region);
          }
        }
        else {
          if (handle) {
            onEditRegion(frame, region);
          }
        }

        moveHandle = false;
        sketch.cursor(sketch.ARROW);

        break;

      case "merge":
        if (!moveMouse) {
          if (highlightRegion && highlightRegion !== region) {
            RegionEditing.mergeRegions(region, highlightRegion, 1.1 / images[0].width, segmentationData[frame].regions);
            onEditRegion(frame, region);
          }
        }

        break;

      case "split":
        if (splitLine) {
          RegionEditing.splitRegion(region, splitLine, 0.5 / images[0].width, segmentationData[frame].regions);
          updateRegionColorMap();
          onEditRegion(frame, region);
        }

        splitLine = null;

        break;

      case "trim":
        if (splitLine) {
          RegionEditing.trimRegion(region, splitLine);
          onEditRegion(frame, region);
        }

        splitLine = null;

        break;

      case "regionEdit":
        if (moveMouse) return;

        if (highlightRegion) {
          RegionEditing.removeRegion(highlightRegion, segmentationData[frame].regions);
          onEditRegion(frame, region);
        }
        else {
          let newRegion = RegionEditing.addRegion(
            normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY])),
            (region.max[0] - region.min[0]) / 2,
            segmentationData[frame].regions
          );

          updateRegionColorMap();

          onEditRegion(frame, newRegion);
          onSelectRegion(frame, newRegion);
        }

        break;

      case "regionSelect":
        if (moveMouse) return;

        if (highlightRegion) {
          onSelectRegion(frame, highlightRegion);
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

  function updateRegionColorMap() {
    // Set colors
    let ids = [];
    segmentationData.forEach(function(frame) {
      frame.regions.forEach(function(region) {
        if (ids.indexOf(region.id) === -1) ids.push(region.id);
      });
    });

    regionColorMap = {};
    ids.forEach(function(id, i) {
      regionColorMap[id] = regionColors[i % regionColors.length];
    });
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
    var x = sketch.mouseX,
        y = sketch.mouseY;

    if (x < 0 || x >= sketch.width ||
        y < 0 || y >= sketch.height ||
        !segmentationData) return;

    // Mouse position
    var m = applyZoom([sketch.mouseX, sketch.mouseY]);

    // Clear highlighting
    handle = null;

    var seg = segmentationData[frame].regions;

    seg.forEach(function(region) {
      region.highlight = false;
    });

    sketch.cursor(sketch.ARROW);

    switch (editMode) {
      case "playback":
        if (scale !== 1) {
          sketch.cursor(sketch.MOVE);
        }

      case "regionEdit":
      case "regionSelect":
      case "merge":
        // Test regions
        for (var i = 0; i < seg.length; i++) {
          if (MathUtils.insidePolygon(normalizePoint(m), seg[i].vertices)) {
            seg[i].highlight = true;

            sketch.cursor(sketch.HAND);

            break;
          }
        }

        break;

      case "vertex":
        sketch.cursor(sketch.CROSS);

        // Test vertices
        var region = experiment.selectedRegion.region;

        // Radius
        var r = handleHighlightRadius / scale;

        for (var i = 0; i < region.vertices.length; i++) {
          var p = scalePoint(region.vertices[i]);
          var d = sketch.dist(m[0], m[1], p[0], p[1]);

          if (d <= r) {
            handle = region.vertices[i];
            sketch.cursor(sketch.HAND);
          }
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
    var x = p[0] - translation[0] * scale;
    x /= scale;

    var y = p[1] - translation[1] * scale;
    y /= scale;

    return [x, y];
  }

  function normalizePoint(p) {
    return [p[0] / sketch.width, p[1] / sketch.height];
  }

  function scalePoint(p) {
    return [p[0] * sketch.width, p[1] * sketch.height];
  }
}
