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

    switch (editMode) {
      case "playback":
        if (!moveMouse) {
          // Select segmentation region
          if (segmentationData) {
            var selected = segmentationData[frame].filter(function(region) {
              return region.highlight;
            });

            if (selected.length > 0) {
              onSelectRegion(frame, selected[0]);
            }
            else {
              onSelectRegion();
            }
          }
        }

        break;

      case "vertex":
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

        break;

      case "merge":
        if (!moveMouse) {
          // Select segmentation region
          // XXX: Redundant with code above
          var merge = segmentationData[frame].filter(function(region) {
            return region.highlight;
          });

          merge = merge.length > 0 ? merge[0] : null;

          if (merge && merge !== experiment.selectedRegion.region) {
            var dilation = 1.1 / images[0].width;

            var selected = experiment.selectedRegion.region;

            // Dilate the two regions
            var selectedDilate = dilate(selected.vertices, dilation);
            var mergeDilate = dilate(merge.vertices, dilation);

            // Nullify points in the dilation intersection
            var selectedValid = selected.vertices.map(function(v) {
              return insidePolygon(v, mergeDilate) ? null : v;
            });

            var mergeValid = merge.vertices.map(function(v) {
              return insidePolygon(v, selectedDilate) ? null : v;
            });

            if (selectedValid.indexOf(null) === -1 || mergeValid.indexOf(null) === -1) {
              // Get non-null vertices
              selectedValid = selectedValid.filter(function(d) { return d !== null; });
              mergeValid = mergeValid.filter(function(d) { return d !== null; });

              // Find two closest point pairs and merge them
              var pairs = [];
              selectedValid.forEach(function(v1, i) {
                mergeValid.forEach(function(v2, j) {
                  pairs.push({
                    i: i,
                    j: j,
                    d2: distance2(v1, v2)
                  });
                });
              });

              pairs.sort(function(a, b) {
                return a.d2 - b.d2;
              });

              var pair1 = pairs[0];
              var pair2;
              for (var i = 1; i < pairs.length; i++) {
                var p = pairs[i];

                if (p.i !== pair1.i && p.j !== pair1.j) {
                  pair2 = p;
                  break;
                }
              }

              // Sort by lowest i index
              if (pair1.i > pair2.i) {
                var temp = pair1;
                pair1 = pair2;
                pair2 = temp;
              }

              function mergePoints(p1, p2) {
                return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
              }

              // Merge regions
              var merged = [];

              for (var i = 0; i < pair1.i; i++) {
                merged.push(selectedValid[i]);
              }

              merged.push(mergePoints(selectedValid[pair1.i], mergeValid[pair1.j]));

              // XXX: Refactor to reduce redundancy with above code
              for (var i = 0; i < mergeValid.length; i++) {
                var j = (i + pair1.j + 1) % mergeValid.length;

                if (j === pair2.j) break;

                merged.push(mergeValid[j]);
              }

              merged.push(mergePoints(selectedValid[pair2.i], mergeValid[pair2.j]));

              for (var i = pair2.i + 1; i < selectedValid.length; i++) {
                merged.push(selectedValid[i]);
              }

              // Update the vertices
              setVertices(selected, merged);

              // Remove the other region
              segmentationData[frame].splice(segmentationData[frame].indexOf(merge), 1);
            }
            else {
              // Merge regions
              var merged = [];
              var mergeStart;
              for (var i = 0; i < selectedValid.length; i++) {
                var v1 = selectedValid[i];

                if (v1) {
                  // Add this one
                  merged.push(v1);

                  var v2 = selectedValid[(i + 1) % selectedValid.length];

                  if (!v2) {
                    // Find closest merge point
                    var closest = mergeValid.reduce(function(p, c, i) {
                      if (!c) return p;

                      var d2 = distance2(v1, c);

                      return p === null || d2 < p.d2 ? {
                        i: i,
                        d2: d2
                      } : p;
                    }, null);

                    mergeStart = closest.i;

                    selectedValid[i] = null;

                    break;
                  }
                }

                selectedValid[i] = null;
              }

              // XXX: Refactor to reduce redundancy with above code
              var selectedStart;
              for (var i = 0; i < mergeValid.length; i++) {
                var i1 = (i + mergeStart) % mergeValid.length;

                var v1 = mergeValid[i1];

                if (v1) {
                  // Add this one
                  merged.push(v1);

                  var v2 = mergeValid[(i1 + 1) % mergeValid.length];

                  if (!v2) {
                    // Find closest merge point
                    var closest = selectedValid.reduce(function(p, c, i) {
                      if (!c) return p;

                      var d2 = distance2(v1, c);

                      return p === null || d2 < p.d2 ? {
                        i: i,
                        d2: d2
                      } : p;
                    }, null);

                    selectedStart = closest.i;

                    mergeValid[i1] = null;

                    break;
                  }
                }

                mergeValid[i1] = null;
              }

              for (var i = selectedStart; i < selectedValid.length; i++) {
                var v = selectedValid[i];

                if (v) merged.push(v);
                //else break;
              }

              // Update the vertices
              setVertices(selected, merged);

              // Remove the other region
              segmentationData[frame].splice(segmentationData[frame].indexOf(merge), 1);
            }
          }
        }

        break;

      case "split":
        if (splitLine) {
          // Find intersections with region line segments
          var vertices = experiment.selectedRegion.region.vertices;
          var intersections = [];

          for (var i = 0; i < vertices.length; i++) {
            var v1 = vertices[i],
                v2 = vertices[i === vertices.length - 1 ? 0 : i + 1];

            var p = lineSegmentIntersection(splitLine[0], splitLine[1], v1, v2);

            if (p) {
              intersections.push({
                index: i,
                point: p
              });
            }
          }

          if (intersections.length === 2) {
            // Offset amount
            var offset = 0.5 / images[0].width;

            // Split into two regions
            var v1 = [];
            var v2 = [];

            for (var i = 0; i < vertices.length; i++) {
              var v = vertices[i];

              if (i === intersections[0].index) {
                var p = intersections[0].point;

                var x = normalizeVector([p[0] - v[0], p[1] - v[1]]);
                x[0] *= offset;
                x[1] *= offset;

                v1.push(v);
                v1.push([p[0] - x[0], p[1] - x[1]]);

                v2.push([p[0] + x[0], p[1] + x[1]]);
              }
              else if (i === intersections[1].index) {
                var p = intersections[1].point;

                var x = normalizeVector([p[0] - v[0], p[1] - v[1]]);
                x[0] *= offset;
                x[1] *= offset;

                v2.push(v);
                v2.push([p[0] - x[0], p[1] - x[1]]);

                v1.push([p[0] + x[0], p[1] + x[1]]);
              }
              else if (i > intersections[0].index && i < intersections[1].index) {
                v2.push(v);
              }
              else {
                v1.push(v);
              }
            }

            var regions = segmentationData[frame];

            var r1 = experiment.selectedRegion.region;
            var newRegion = {
              id: "object" + regions.length,
              selected: false
            };

            setVertices(experiment.selectedRegion.region, v1);
            setVertices(newRegion, v2);

            regions.push(newRegion);
          }
        }

        splitLine = null;

        break;

      case "trim":
        if (splitLine) {
          // Find intersections with region line segments
          var vertices = experiment.selectedRegion.region.vertices;
          var intersections = [];

          for (var i = 0; i < vertices.length; i++) {
            var v1 = vertices[i],
                v2 = vertices[i === vertices.length - 1 ? 0 : i + 1];

            var p = lineSegmentIntersection(splitLine[0], splitLine[1], v1, v2);

            if (p) {
              intersections.push({
                index: i,
                point: p
              });
            }
          }

          if (intersections.length === 2) {
            // Split into two regions
            var v1 = [];
            var v2 = [];

            for (var i = 0; i < vertices.length; i++) {
              var v = vertices[i];

              if (i > intersections[0].index && i <= intersections[1].index) {
                v2.push(v);
              }
              else {
                v1.push(v);
              }
            }

            // Keep region with most vertices
            if (v1.length > v2.length) {
              setVertices(experiment.selectedRegion.region, v1);
            }
            else if (v2.length > v1.length) {
              setVertices(experiment.selectedRegion.region, v2);
            }
          }
        }

        splitLine = null;

        break;

      case "regionEdit":
        if (moveMouse) return;

        // Select segmentation region
        // XXX: Redundant with code above
        var selected = segmentationData[frame].filter(function(region) {
          return region.highlight;
        });

        selected = selected.length > 0 ? selected[0] : null;

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

          // Equilateral triangle
          var r = 1 / (scale * 1.5 * 2);
          var a = Math.PI / 6;
          var x = Math.cos(a) * r;
          var y = Math.sin(a) * r;

          var region = {
            center: m,
            id: "object" + regions.length,
            min: [m[0] - r, m[1] - r],
            max: [m[0] + r, m[1] + r],
            selected: false,
            vertices: [
              [m[0] + x, m[1] + y],
              [m[0] - x, m[1] + y],
              [m[0], m[1] - r]
            ]
          };

          regions.push(region);

          onSelectRegion(frame, region);
        }

        break;

      case "regionSelect":
        if (moveMouse) return;

        // Select segmentation region
        // XXX: Redundant with code above
        var selected = segmentationData[frame].filter(function(region) {
          return region.highlight;
        });

        selected = selected.length > 0 ? selected[0] : null;

        if (selected) {
          onSelectRegion(frame, selected);
        }

        break;
    }

    highlight();
    sketch.redraw();

    function setVertices(region, vertices) {
      region.vertices = vertices;

      // Get extent
      var x = vertices.map(function (vertex) { return vertex[0]; });
      var y = vertices.map(function (vertex) { return vertex[1]; });

      region.min = [
        x.reduce(function(p, c) { return Math.min(p, c); }),
        y.reduce(function(p, c) { return Math.min(p, c); })
      ];

      region.max = [
        x.reduce(function(p, c) { return Math.max(p, c); }),
        y.reduce(function(p, c) { return Math.max(p, c); })
      ];

      region.center = [
        (region.min[0] + region.max[0]) / 2,
        (region.min[1] + region.max[1]) / 2
      ];
    }

    function dilate(vertices, alpha) {
      return vertices.map(function(v, i, a) {
        // Get neighbors
        var v1 = i === 0 ? a[a.length - 1] : a[i - 1];
        var v2 = i === a.length - 1 ? a[0] : a[i + 1];

        // Get normals
        var n1 = normalizeVector([v[1] - v1[1], -(v[0] - v1[0])]);
        var n2 = normalizeVector([v2[1] - v[1], -(v2[0] - v[0])]);
        var n = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2];

        // Dilate
        return [v[0] + n[0] * alpha, v[1] + n[1] * alpha];
      });
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
          if (insidePolygon(normalizePoint(m), seg[i].vertices)) {
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

  // Various math/vector functions

  function distance2(p1, p2) {
    var x = p1[0] - p2[0];
    var y = p1[1] - p2[1];

    return x * x + y * y;
  }

  function vectorMagnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  }

  function normalizeVector(v) {
    var mag = vectorMagnitude(v);

    return mag === 0 ? [0, 0] : [v[0] / mag, v[1] / mag];
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

  // Return the distance between a point p and a line segment p1p2
  // Based on technique described here: http://paulbourke.net/geometry/pointlineplane/
  function pointLineSegmentDistance(p, p1, p2) {
    // Check for coincident p1 and p2
    if (p1[0] === p2[0] && p1[1] === p2[1]) {
      // Return distance to one of the points
      return sketch.dist(p[0], p[1], p1[0], p1[1]);
    }

    // Compute u
    var u = ((p[0] - p1[0]) * (p2[0] - p1[0]) + (p[1] - p1[1]) * (p2[1] - p1[1])) /
            (Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));

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

  // Return intersection point of two line segments
  // Based on technique described here: http://paulbourke.net/geometry/pointlineplane/
  function lineSegmentIntersection(p1, p2, p3, p4) {
    // Check that none of the lines are of length 0
  	if ((p1[0] === p2[0] && p1[1] === p2[1]) || (p3[0] === p4[0] && p3[1] === p4[1])) {
  		return false;
  	}

  	var denominator = ((p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1]));

    // Lines are parallel
  	if (denominator === 0) {
  		return null;
  	}

  	var ua = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) / denominator;
  	var ub = ((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) / denominator;

    // Is the intersection along the segments?
  	if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
  		return null;
  	}

    // Return the x and y coordinates of the intersection
  	var x = p1[0] + ua * (p2[0] - p1[0]);
  	var y = p1[1] + ua * (p2[1] - p1[1]);

  	return [x, y];
  }
}
