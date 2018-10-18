var d3Scale = require("d3-scale");
var d3ScaleChromatic = require("d3-scale-chromatic");

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
      onSelectRegion = null;

  // Editing
  var editMode = false;
  var handle = null;
  var moveHandle = false;
  var moveMouse = false;
  // XXX: Need to keep the previous mouse position because mouse moved is firing on mouse pressed
  var oldMouseX = -1, oldMouseY = -1;

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
    editMode = props.editMode;
    traces = props.traces;
    onKeyPress = props.onKeyPress;
    onMouseWheel = props.onMouseWheel;
    onSelectRegion = props.onSelectRegion;
    onUpdateTrace = props.onUpdateTrace;

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

      segmentationData = experiment.segmentationData;

      resizeImages();
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

    // Reset scale and translation
    scale = 1;
    translation = [0, 0];

    if (segmentationData) {
      if (experiment.selectedRegion) {
        var region = experiment.selectedRegion.region;

        var c = scalePoint(region.center);

        var w = region.max[0] - region.min[0];
        var h = region.max[1] - region.min[1];

        var s = Math.max(w, h) * 1.5;

        scale = 1 / s;
        translation = [sketch.width / 2 / scale - c[0], sketch.height / 2 / scale - c[1]];

        sketch.scale(scale);
        sketch.translate(translation[0], translation[1]);
      }
    }

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
      segmentationData[frame].forEach(function(region) {
//        if (region.selected) sketch.stroke(203,24,29);
//        else sketch.stroke(127, 127, 127);
        sketch.stroke(255, 255, 255, 127);

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

        if (editMode && region.selected) {
          // Draw points
          sketch.ellipseMode(sketch.RADIUS);
          sketch.fill(127, 127, 127);
          sketch.noStroke();

          var r = handleRadius / scale;

          region.vertices.forEach(function(vertex) {
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

    // Save mouse position
    oldMouseX = sketch.mouseX;
    oldMouseY = sketch.mouseY;
    moveMouse = false;
  }

  function mouseMoved(e) {
    e.preventDefault();

    // Check mouse position
    if (sketch.mouseX === oldMouseX && sketch.mouseY === oldMouseY) return;
    oldMouseX = sketch.mouseX;
    oldMouseY = sketch.mouseY;
    moveMouse = true;

    if (editMode) {
      if (sketch.mouseIsPressed && sketch.mouseButton === sketch.LEFT && handle) {
        moveHandle = true;
        sketch.noCursor();
      }

      if (moveHandle) {
        var m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));
        handle[0] = m[0];
        handle[1] = m[1];

        sketch.redraw();
      }
      else if (!sketch.mouseIsPressed) {
        highlight();

        sketch.redraw();
      }
    }
    else {
      highlight();

      sketch.redraw();
    }
  }

  function mouseReleased(e) {
    e.preventDefault();

    switch (sketch.mouseButton) {
      case sketch.LEFT:
        if (editMode) {
          if (!moveMouse) {
            var vertices = experiment.selectedRegion.region.vertices;

            if (handle) {
              // Remove handle
              var i = vertices.indexOf(handle);

              vertices.splice(i, 1);

              // XXX: Check for empty vertices? Remove region if so?
            }
            else {
              // Add handle at mouse position
              var m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

              // Get indeces for pairs of vertices
              var segments = vertices.reduce(function(p, c, i, a) {
                if (i === a.length - 1) p.push([i, 0]);
                else p.push([i, i + 1]);
                return p;
              }, []);

              // Find closest line segment to this point
              var segment = segments.reduce(function(p, c, i) {
                var d = pointLineSegmentDistance(m, vertices[c[0]], vertices[c[1]]);
                return d < p.d ? { d: d, i: i } : p;
              }, { d: 1.0, i: -1 });

              // Insert new point
              vertices.splice(segments[segment.i][1], 0, m);
            }
          }

          moveHandle = false;
          sketch.cursor(sketch.ARROW);

          sketch.redraw();
        }
        else {
          if (!moveMouse) {
            // Select segmentation region
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
          }
        }

        break;

      case sketch.CENTER:
        if (moveMouse) return;

        // Select segmentation region
        // XXX: Redundant with code above
        var selected = segmentationData[frame].filter(function(region) {
          return region.highlight;
        });

        selected = selected.length > 0 ? selected[0] : null;

        if (editMode) {
          if (selected) {
            // Delete region
            var regions = segmentationData[frame];
            var i = regions.indexOf(selected);
            regions.splice(i, 1);
          }
          else {
            // Add region
            var regions = segmentationData[frame];

            var m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

            var w = 1 / (scale * 1.5 * 2);

            var region = {
              center: m,
              id: "object" + regions.length,
              min: [m[0] - w, m[1] - w],
              max: [m[0] + w, m[1] + w],
              selected: false,
              vertices: [
                [m[0] - w, m[1] - w],
                [m[0] - w, m[1] + w],
                [m[0] + w, m[1] + w],
                [m[0] + w, m[1] - w]
              ]
            };

            regions.push(region);

            onSelectRegion(region);
          }
        }
        else {
          if (selected) {
            // Delete region
            var regions = segmentationData[frame];
            var i = regions.indexOf(selected);
            regions.splice(i, 1);
          }
          else {
            // Add region
            var regions = segmentationData[frame];

            var m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

            var w = 0.02;

            var region = {
              center: m,
              id: "object" + regions.length,
              min: [m[0] - w, m[1] - w],
              max: [m[0] + w, m[1] + w],
              selected: false,
              vertices: [
                [m[0] - w, m[1] - w],
                [m[0] - w, m[1] + w],
                [m[0] + w, m[1] + w],
                [m[0] + w, m[1] - w]
              ]
            };

            regions.push(region);
          }
        }

        sketch.redraw();
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
    var x = sketch.mouseX,
        y = sketch.mouseY;

    if (x < 0 || x >= sketch.width ||
        y < 0 || y >= sketch.height ||
        !segmentationData) return;

    // Mouse position
    var m = applyZoom([sketch.mouseX, sketch.mouseY]);

    // Clear highlighting
    handle = null;

    var seg = segmentationData[frame];

    seg.forEach(function(region) {
      region.highlight = false;
    });

    if (editMode) {
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
    }

    if (!handle) {
      sketch.cursor(sketch.ARROW);

      // Test regions
      for (var i = 0; i < seg.length; i++) {
        if (insidePolygon(normalizePoint(m), seg[i].vertices)) {
          seg[i].highlight = true;

          break;
        }
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

  // Return the distance between a point p and a line segment p1p2
  // Based on technique described here: http://paulbourke.net/geometry/pointlineplane/
  function pointLineSegmentDistance(p, p1, p2) {
    // Check for coincident p1 and p2
    if (p1[0] === p2[0] && p1[1] === p2[1]) {
      // Return distance to one of the points
      return sketch.dist(p[0], p[1], p1[0], p1[1]);
    }

    // Compute u
    var u = ( (p[0] - p1[0]) * (p2[0] - p1[0]) + (p[1] - p1[1]) * (p2[1] - p1[1]) ) /
            ( Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2) );

    // Test u
    if (u >= 0 && u <= 1) {
      // In line segement, return closest point on line
      var p3 = [ p1[0] + u * (p2[0] - p1[0]),
                 p1[1] + u * (p2[1] - p1[1]) ];

      return sketch.dist(p[0], p[1], p3[0], p3[1]);
    }
    else {
      // Return closest line segment end point
      return Math.min(sketch.dist(p[0], p[1], p1[0], p1[1]), sketch.dist(p[0], p[1], p2[0], p2[1]));
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
