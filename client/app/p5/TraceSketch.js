import * as d3 from "d3";
import { lineSegmentIntersection, insidePolygon, pointLineSegmentDistance } from "../utils/MathUtils";
import { 
  addVertex, removeVertex, mergeRegions, splitRegion, trimRegion, 
  removeRegion, addRegion, moveRegion, rotateRegion, 
  copiedRegion, copyRegion, pasteRegion } from "../utils/RegionEditing";

export default function(sketch) {
  // Current experiment
  let experiment = null,
      allRegions = null,
      visibleRegions = null;

  // Images
  let images = [],
      colorImages = [],
      contrastImages = [],
      frame = 0,
      lut = createLut(d3.interpolateInferno),
      onUpdateLoading = null;

  // Interaction
  let onKeyPress = null,
      onMouseWheel = null;

  // Segmentation
  let segmentationData = null,
      colors = d3.schemeDark2.slice(0, -1),
      strokeColorMap = d3.scaleOrdinal(colors.map(c => {
        const color = d3.color(c);
        color.opacity = 0.75;
        return color.toString();
      })),
      fillColorMap = d3.scaleOrdinal(colors.map(c => {
        const color = d3.color(c);
        color.opacity = 0.25;
        return color.toString();
      }));

  // Callbacks
  let onHighlightRegion = null,
      onSelectRegion = null,
      onSelectZoomPoint = null,
      onEditRegion = null;

  // Editing
  let editView = false,
      editMode = "filmstrip",
      handle = null,
      currentRegion = null,
      mergeRegion = null,
      activeRegions = [],
      moveHandle = false,
      moveMouse = false,
      // XXX: Need to keep the previous mouse position because mouse moved is firing on mouse pressed
      oldMouseX = -1, oldMouseY = -1,
      dragStartX = -1, dragStartY = -1,
      dragVertices = null,
      splitLine = null,
      actionString = "";

  // Settings
  let stabilize = true;

  // Transform
  let zoom = 1,
      zoomPoint = null,
      translation = [0, 0];

  // Appearance
  let lineWeight = 2,
      lineHighlightWeight = 3,
      handleRadius = 3,
      handleHighlightRadius = 5;

  let count = 0;

  sketch.setup = function() {
    // Create canvas with default size
    var canvas = sketch.createCanvas(100, 100);
    canvas.mousePressed(mousePressed);
    canvas.mouseReleased(mouseReleased);
    canvas.mouseMoved(mouseMoved);
    canvas.mouseWheel(mouseWheel);
    canvas.mouseOut(mouseOut);
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
    editMode = props.editMode;
    stabilize = props.stabilize;
    onKeyPress = props.onKeyPress;
    onMouseWheel = props.onMouseWheel;
    onHighlightRegion = props.onHighlightRegion;
    onSelectRegion = props.onSelectRegion;
    onSelectZoomPoint = props.onSelectZoomPoint;
    onEditRegion = props.onEditRegion;

    editView = editMode !== "filmstrip";
    if (editMode !== "split" && editMode !== "trim") splitLine = null;
  
    // Image smoothing
    //sketch.canvas.getContext("2d").imageSmoothingEnabled = editMode === "filmstrip" ? true : false;

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

    if (segmentationData) {
      allRegions = segmentationData[frame].regions;

      // Find visible regions
      if (zoomPoint) {
        // Get visible area
        const z = 1 / zoom / 2,
              area = [zoomPoint[0] - z, zoomPoint[1] - z, 
                      zoomPoint[0] + z, zoomPoint[1] + z];
        visibleRegions = allRegions.filter(region => {
          // Just use bounding box
          return region.min[0] <= area[2] && region.min[1] <= area[3] &&
                region.max[0] >= area[0] && region.max[1] >= area[1]; 
        });
      }
      else {
        visibleRegions = allRegions;
      }
    }
    else {
      allregions = visibleRegions = null;
    }

    highlight();
    sketch.redraw();

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
    const regions = visibleRegions;

    // Set scale and translation
    let p = null;

    if (regions && experiment.centerRegion && stabilize) {
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
    sketch.push()
    sketch.scale(sketch.width / im.width);
    sketch.image(im, 0, 0);
    sketch.pop();

    // Draw segmentation data
    const dashArray = [5 / zoom, 5 / zoom];
    const handleColor = 200;
    const lineBackground = 0;

    sketch.strokeJoin(sketch.ROUND);

    if (regions) {
      regions.forEach(function(region, i, a) {
        const highlightRegion = region.highlight || 
              region === currentRegion || 
              activeRegions.indexOf(region) !== -1;
        let weight = highlightRegion ? lineHighlightWeight : lineWeight;

        weight /= zoom;        

        // Draw outline background
        sketch.stroke(lineBackground);
        sketch.strokeWeight(weight + 1 / zoom);
        sketch.noFill();

        sketch.beginShape();
        region.vertices.forEach(function(vertex) {
          const v = scalePoint(vertex);
          sketch.vertex(v[0], v[1]);
        });
        if (region.vertices.length > 0) {
          const v = scalePoint(region.vertices[0]);
          sketch.vertex(v[0], v[1]);
        }
        sketch.endShape();

        // Draw outline
        sketch.stroke(strokeColorMap(region.trajectory_id));
        sketch.strokeWeight(weight);
        
        //sketch.canvas.getContext("2d").setLineDash(region.unsavedEdit ? dashArray : []);

        //if (region.edited) sketch.fill(fillColorMap(region.trajectory_id));
        //else sketch.noFill();
        //if (region.highlight) sketch.noFill();
        //else sketch.fill(fillColorMap(region.trajectory_id));
        sketch.noFill();

        // Draw outline
        sketch.beginShape();
        region.vertices.forEach(function(vertex) {
          const v = scalePoint(vertex);
          sketch.vertex(v[0], v[1]);
        });
        if (region.vertices.length > 0) {
          const v = scalePoint(region.vertices[0]);
          sketch.vertex(v[0], v[1]);
        }
        sketch.endShape();        

        const showVertices = editMode == "vertex" || editMode == "merge" || editMode == "split" || editMode == "trim";

        if (showVertices) {
          // Draw points
          sketch.ellipseMode(sketch.RADIUS);
          sketch.fill(handleColor);          
          sketch.stroke(lineBackground);
          sketch.strokeWeight(1 / zoom);

          const r = handleRadius / zoom;

          region.vertices.forEach(function(vertex, i) {
            const v = scalePoint(vertex);

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
/*
        // Draw circle marker
        sketch.ellipseMode(sketch.RADIUS);
        sketch.fill(strokeColorMap(region.trajectory_id));
        sketch.noStroke();

        const r = handleHighlightRadius / zoom;
        const x = (region.max[0] - region.min[0]) * 0.75;
        const c = scalePoint([region.center[0] + x, region.center[1]]);
            
        sketch.ellipse(c[0], c[1], r);
*/        
      });
    }

    if (splitLine) {
      sketch.stroke(255, 255, 255, 127);
      sketch.canvas.getContext("2d").setLineDash([]);

      var weight = lineWeight / zoom;
      sketch.strokeWeight(weight);

      // Draw line
      var p1 = scalePoint(splitLine[0]);
      var p2 = scalePoint(splitLine[1]);
      sketch.line(p1[0], p1[1], p2[0], p2[1]);
    }    

    // Draw action string
    sketch.resetMatrix();
    sketch.fill("rgba(255, 255, 255, 0.5)");
    sketch.noStroke();
    const fontSize = sketch.constrain(sketch.width / 20, 10, 24);
    sketch.textSize(fontSize);
    sketch.textAlign(sketch.RIGHT);
    sketch.text(actionString, sketch.width - fontSize / 2, sketch.height - fontSize / 2);
  }

  // XXX: Limit to events on the canvas?
  sketch.keyPressed = function(e) {
    e.preventDefault();

    if (keyPress) {
      onKeyPress(sketch.keyCode);
    }
  }

  function mousePressed(e) {
    e.preventDefault();

    if (sketch.mouseButton && sketch.mouseButton !== sketch.LEFT) return;

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
    else if (editMode === "regionMove" || editMode === "regionRotate") {
      if (currentRegion) {
        const m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

        dragStartX = m[0];
        dragStartY = m[1];

        dragVertices = currentRegion.vertices.slice();
      }
    }
  }

  function mouseMoved(e) {
    e.preventDefault();

    actionString = "";

    if (sketch.mouseButton && sketch.mouseButton !== sketch.LEFT) return;

    const regions = visibleRegions;

    activeRegions = [];

    // Check mouse position
    if (sketch.mouseX === oldMouseX && sketch.mouseY === oldMouseY) return;
    oldMouseX = sketch.mouseX;
    oldMouseY = sketch.mouseY;
    moveMouse = true;

    switch (editMode) {
      case "filmstrip":
      break;

      case "vertex":
        if (sketch.mouseIsPressed && handle) {
          moveHandle = true;
          sketch.noCursor();
          actionString = "Moving vertex";
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
            const intersections = regionLineSegmentIntersections(region, splitLine);
            if (intersections > 0 && intersections % 2 === 0) activeRegions.push(region);
          });

          const numRegions = activeRegions.length;

          if (numRegions > 0) {
            actionString = editMode === "split" ? "Split region" : "Trim region";
            if (numRegions > 1) actionString += "s";
          }
        }

        break;

      case "regionEdit":
        break;

      case "regionMove":
        if (sketch.mouseIsPressed && currentRegion) {
          actionString = "Moving region";

          const m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));

          const dx = m[0] - dragStartX;
          const dy = m[1] - dragStartY;

          moveRegion(currentRegion, dragVertices, dx, dy);
        }
        break;

      case "regionRotate":
        if (sketch.mouseIsPressed && currentRegion) {
          actionString = "Rotating region";

          const m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));
          const c = currentRegion.center;;

          const v1 = [dragStartX - c[0], dragStartY - c[1]];
          const v2 = [m[0] - c[0], m[1] - c[1]];

          const theta = Math.atan2(v1[0], v1[1]) - Math.atan2(v2[0], v2[1]);

          rotateRegion(currentRegion, dragVertices, theta);
        }
        break;

      case "regionCopy":
      case "regionPaste":
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

        const p = lineSegmentIntersection(line[0], line[1], v1, v2);

        if (p) intersections++;
      }

      return intersections;
    }
  }

  function mouseReleased(e) {
    e.preventDefault();

    actionString = "";

    if (sketch.mouseButton !== sketch.LEFT) return;

    const regions = visibleRegions;

    switch (editMode) {
      case "filmstrip":
      case "regionSelect":
        if (!moveMouse) {
          // Select segmentation region
          if (currentRegion) {
            onSelectRegion(frame, currentRegion);
          }
          else if (onSelectZoomPoint) {
            onSelectZoomPoint(frame, normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY])));
          }  
        }

        break;

      case "vertex":
        if (!currentRegion) break;

        if (!moveMouse) {
          if (handle) {
            if (removeVertex(currentRegion, handle)) {
              onEditRegion(frame, currentRegion);
            }
          }
          else {
            // Add handle at mouse position
            addVertex(currentRegion, normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY])));
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
            mergeRegions(mergeRegion, currentRegion, allRegions);
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
          activeRegions.forEach(region => {
            const newRegion = splitRegion(region, splitLine, 0.5 / images[0].width, allRegions);
            
            if (newRegion) {
              onEditRegion(frame, region);
              onEditRegion(frame, newRegion);
            }
          });
        }

        splitLine = null;        

        break;

      case "trim":
        if (splitLine) {
          activeRegions.forEach(region => {
            if (trimRegion(region, splitLine)) {
              onEditRegion(frame, region);
            }
          });
        }

        splitLine = null;

        break;

      case "regionEdit":
        if (moveMouse) return;

        if (currentRegion) {
          removeRegion(currentRegion, allRegions);
          onEditRegion(frame, currentRegion);
        }
        else {
          const radius = regions.length === 0 ? 0.01 : regions.reduce((p, c) => {
            return p + c.max[0] - c.min[0];
          }, 0) / regions.length / 2;

          const newRegion = addRegion(
            normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY])),
            radius, allRegions
          );

          onEditRegion(frame, newRegion);
          onSelectRegion(frame, newRegion);
        }

        break;

      case "regionMove":
      case "regionRotate":
        if (currentRegion) {
          onEditRegion(frame, currentRegion);
        }

        break;

      case "regionCopy":
        if (moveMouse) return;

        if (currentRegion) {
          copyRegion(currentRegion);
          onEditRegion(frame, null);
        }

        break;

      case "regionPaste":
        if (moveMouse) return;

        const newRegion = pasteRegion(normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY])), allRegions);
        onEditRegion(frame, newRegion);

        break;
    }

    highlight();
    sketch.redraw();
  }

  function mouseWheel(e) {
    e.preventDefault();

    if (onMouseWheel) {
      onMouseWheel(Math.round(-e.deltaY / 100));
    }

    return false;
  }

  function mouseOut() {
    actionString = "";
    sketch.redraw();
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
    let im = images[0],
        aspect = im.width / im.height,
        w = innerWidth(sketch._userNode),
        h = w / aspect;

    sketch.resizeCanvas(w, h);    
  }

  function highlight() {
    if (sketch.mouseIsPressed) return;

    // Get mouse position
    const x = sketch.mouseX,
          y = sketch.mouseY;

    if (x < 0 || x >= sketch.width ||
        y < 0 || y >= sketch.height ||
        !segmentationData) {          
      actionString = "";
      return;
    }

    // Mouse position
    const m = applyZoom([sketch.mouseX, sketch.mouseY]);

    // Clear highlighting
    handle = null;
    const previousRegion = currentRegion;
    currentRegion = null;
    if (editMode !== "merge") mergeRegion = null;

    const regions = visibleRegions;

    sketch.cursor(sketch.ARROW);

    switch (editMode) {
      case "filmstrip":
      case "regionEdit":
      case "regionMove":
      case "regionRotate":
      case "regionCopy":
      case "regionSelect":
      case "merge":
        actionString = 
          editMode === "regionEdit" ? "Add region" : 
          editMode === "filmstrip" || editMode === "regionSelect" ? "Center on point": ""; 

        // Test regions
        const p = normalizePoint(m);

        for (var i = 0; i < regions.length; i++) {
          const region = regions[i];        

          if (insidePolygon(p, region.vertices, [region.min, region.max])) {
            currentRegion = region;

            sketch.cursor(sketch.HAND);

            actionString = 
              editMode === "regionEdit" ? "Remove region" : 
              editMode === "regionMove" ? "Move region" :
              editMode === "regionRotate" ? "Rotate region" :
              editMode === "regionCopy" ? "Copy region" : 
              editMode === "merge" && !mergeRegion ? "Select first merge region" :
              editMode === "merge" && mergeRegion ? "Select second merge region" :
              editMode === "filmstrip" || editMode === "regionSelect" ? "Center on region" : ""; 

            break;
          }
        }

        break;

      case "vertex":
        sketch.cursor(sketch.CROSS);

        // Radius
        const r = handleHighlightRadius / zoom;

        // Find closest point and line segment
        let closestVertex = null;
        let closestVertexDistance = null;
        let closestSegmentDistance = null;
        regions.forEach(region => {
          region.vertices.forEach((v1, i, a) => {
            const p1 = scalePoint(v1);
            const p2 = scalePoint(a[i === a.length - 1 ? 0 : i + 1]);

            const dVertex = sketch.dist(m[0], m[1], p1[0], p1[1]);
            const dSegment = pointLineSegmentDistance(m, p1, p2);

            if (!closestVertexDistance || dVertex < closestVertexDistance) {
              closestVertex = v1;
              closestVertexDistance = dVertex;
            }

            if (!closestSegmentDistance || dSegment < closestSegmentDistance) {
              closestSegmentDistance = dSegment;
              currentRegion = region;
            }
          });
        });

        if (currentRegion) {
          actionString = "Add vertex";

          if (closestVertexDistance < r) {
            handle = closestVertex;
            sketch.cursor(sketch.HAND);

            actionString = "Remove vertex";
          }
        }

        break;

      case "regionPaste":
        actionString = "Paste region";
        break;

      case "split":
        break;

      case "trim":
        break;
    }

    if (currentRegion !== previousRegion) {
      const f = editView ? null : frame;

      setTimeout(() => { onHighlightRegion(f, currentRegion); }, 0);
    }
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
