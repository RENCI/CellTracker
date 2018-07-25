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
    onUpdateLoading = props.onUpdateLoading;
    onUpdateTrace = props.onUpdateTrace;

    // Check for new experiment
    if (experimentId !== props.experiment.id) {
      experimentId = props.experiment.id;
      var numFrames = props.experiment.frames;

      // Clear current data
      images = [];

      // Load images
      var tempImages = [];
      for (var i = 1; i <= numFrames; i++) {
        sketch.loadImage("/display-image/" + experimentId + "/" + imageType + "/" + i, function (im) {
          tempImages.push(im);

          if (tempImages.length === numFrames) {
            onUpdateLoading(null);

            images = tempImages.slice();

            resizeImages();
          }
          else {
            onUpdateLoading(tempImages.length + 1, numFrames);
          }
        });
      }
    }

    sketch.redraw();
  }

  sketch.windowResized = function() {
    resizeImages();
  }

  sketch.draw = function() {
    if (images.length === 0) return;

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
    trace = !trace;

    sketch.cursor(trace ? sketch.CROSS : sketch.ARROW);

    if (trace) points = [];
    else onUpdateTrace(getTrace());

    return false;
  }

  function mouseWheel(e) {
    onMouseWheel(-e.deltaY / 100);

    return false;
  }

  function getTrace() {
    return points.slice();
  }

  function mouseMoved() {
/*
    var x = sketch.mouseX,
        y = sketch.mouseY;

    if (x < 0 || x >= sketch.width ||
        y < 0 || y >= sketch.height) return;

    var r = 20,
        r2 = r * r;

    var im = images[frame],
        contrastIm = contrastImages[frame],
        colorIm = colorImages[frame];

    im.loadPixels();
    colorIm.loadPixels();

    var minMax = contrastIm[x + y * im.width];

    for (var i = 0; i < im.width; i++) {
      for (var j = 0; j < im.height; j++) {
        var k = (i + j * im.width) * 4,
            v = im.pixels[k],
            dx = i - x,
            dy = j - y,
            d2 = dx * dx + dy * dy;

        if (d2 <= r2) {
          v = Math.round(sketch.map(v, minMax[0], minMax[1], 0, 255, true));
        }

        var c = lut[v];

        colorIm.pixels[k] = c[0];
        colorIm.pixels[k + 1] = c[1];
        colorIm.pixels[k + 2] = c[2];
      }
    }

    colorIm.updatePixels();

    sketch.redraw();
*/    
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
    // Size canvas to image aspect ratio
    var im = images[0],
        aspect = im.width / im.height;

    // Get parent div
    // XXX: Pass through props?
    var div = sketch.select("#sketchDiv"),
        w = innerWidth(div.elt),
        h = w / aspect;

    // Resize images
    images.forEach(function(im) {
      im.resize(w, h);
    });
/*
    var r = 20,
        r2 = r * r;

    contrastImages = images.map(function(im) {
      var contrastIm = [];

      // XXX: Move after im.resize?
      im.loadPixels();

      for (var x = 0; x < im.width; x++) {
        for (var y = 0; y < im.height; y++ ) {
          var min = 255,
              max = 0;

          for (var i = Math.max(0, x - r); i <= Math.min(x + r, im.width - 1); i++) {
            for (var j = Math.max(0, y - r); j <= Math.min(y + r, im.height - 1); j++) {
              var k = (i + j * im.width) * 4,
                  v = im.pixels[k],
                  dx = i - x,
                  dy = j - y,
                  d2 = dx * dx + dy * dy;

              if (d2 <= r2) {
                if (v < min) min = v;
                if (v > max) max = v;
              }
            }
          }

          contrastIm.push([min, max]);
        }
      }

      return contrastIm;
    });
*/

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

  function innerWidth(element) {
    var cs = getComputedStyle(element);

    var padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
        border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);

    return element.offsetWidth - padding - border;
  }
}
