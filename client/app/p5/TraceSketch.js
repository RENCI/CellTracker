var d3Scale = require("d3-scale");
var d3ScaleChromatic = require("d3-scale-chromatic");

module.exports = function (sketch) {
  // Current experiment
  var experimentId = null;

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
      onSelectRegion = null;

  sketch.setup = function() {
    // Create canvas with default size
    var canvas = sketch.createCanvas(100, 100);
    canvas.mouseClicked(mouseClicked);
    canvas.mouseWheel(mouseWheel);
    canvas.mouseMoved(mouseMoved);
    sketch.noLoop();
  }

  sketch.updateProps = function(props) {
    // Set props
    frame = props.frame;
    traces = props.traces;
    onKeyPress = props.onKeyPress;
    onMouseWheel = props.onMouseWheel;
    onSelectRegion = props.onSelectRegion;
    onUpdateTrace = props.onUpdateTrace;

    // Check for new experiment
    if (experimentId !== props.experiment.id) {
      experimentId = props.experiment.id;

      images = props.experiment.images.map(function(d) {
        var w = d.width,
            h = d.height,
            im = sketch.createImage(w, h);

        im.copy(d, 0, 0, w, h, 0, 0, w, h);

        return im;
      });

      segmentationData = props.experiment.segmentationData;

      resizeImages();
    }

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

    highlight(sketch.mouseX, sketch.mouseY);

    // Get image
    var im = colorImages[frame];

    // Dimensions
    var maxX = sketch.width - 1;
    var maxY = sketch.height - 1;

    if (trace && frame > 0) {
      // Get normalized mouse position at end of last frame
      var x = sketch.map(sketch.mouseX, 0, maxX, 0, 1, true),
          y = sketch.map(sketch.mouseY, 0, maxY, 0, 1, true);

      points.push([x, y, frame - 1]);
    }

    // Draw the image
    sketch.image(im, 0, 0);

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
      sketch.ellipse(p[0] * maxX, p[1] * maxY, s, s);
    });

    // Draw segmentation data
    if (segmentationData) {
      segmentationData[frame].forEach(function(region) {
        if (region.selected) sketch.stroke(203,24,29);
        else sketch.stroke(127, 127, 127);

        var weight = 1;
        if (region.selected) weight++;
        if (region.highlight) weight++;

        sketch.strokeWeight(weight);

        region.vertices.forEach(function(p0, i, a) {
          var p1 = i < a.length - 1 ? a[i + 1] : a[0];

          sketch.line(p0[0] * maxX, p0[1] * maxY, p1[0] * maxX, p1[1] * maxY);
        });
      });
    }

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
  }

  // XXX: Limit to events on the canvas?
  sketch.keyPressed = function() {
    onKeyPress(sketch.keyCode);
  }

  function mouseClicked() {
    // Draw segmentation data
    if (segmentationData) {
      var selected = segmentationData[frame].filter(function(region) {
        return region.highlight;
      });

      if (selected.length > 0) {
        onSelectRegion(selected[0]);
      }
      else {
        onSelectRegion(null);
      }
    }

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
    onMouseWheel(Math.round(-e.deltaY / 100));

    return false;
  }

  function getTrace() {
    return points.slice();
  }

  function mouseMoved() {
    highlight(sketch.mouseX, sketch.mouseY);
    sketch.redraw();
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

  function highlight(x, y) {
    // Get mouse position
    var x = sketch.mouseX,
        y = sketch.mouseY;

    if (x < 0 || x >= sketch.width ||
        y < 0 || y >= sketch.height ||
        !segmentationData) return;

    // Normalize mouse position
    var maxX = sketch.width - 1;
    var maxY = sketch.height - 1;

    x = sketch.map(x, 0, maxX, 0, 1, true),
    y = sketch.map(y, 0, maxY, 0, 1, true);

    // Clear highlighting
    var seg = segmentationData[frame];

    seg.forEach(function(region) {
      region.highlight = false;
    });

    for (var i = 0; i < seg.length; i++) {
      if (insidePolygon([x, y], seg[i].vertices)) {
        seg[i].highlight = true;

        break;
      }
    }

    // Adapted from: http://paulbourke.net/geometry/polygonmesh/
    function insidePolygon(p, polygon) {
      var n = polygon.length,
          counter = 0;

      var p0 = polygon[0];

      for (var i = 1; i <= n; i++) {
        var p1 = polygon[i % n];

        if (p[1] > Math.min(p0[1], p1[1])) {
          if (p[1] <= Math.max(p0[1], p1[1])) {
            if (p[0] <= Math.max(p0[0], p1[0])) {
              if (p0[1] !== p1[1]) {
                var xInt = (p[1] - p0[1]) * (p1[0] - p0[0]) / (p1[1] - p0[1]) + p0[0];

                if (p0[0] === p1[0] || p[0] <= xInt) counter++;
              }
            }
          }
        }

        p0 = p1;
      }

      if (counter % 2 === 0) return false;
      else return true;
    }
  }

  function innerWidth(element) {
    var cs = getComputedStyle(element);

    var padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
        border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);

    return element.offsetWidth - padding - border;
  }
}
