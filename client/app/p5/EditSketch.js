import * as d3 from "d3";
import knn from "rbush-knn";
import { lineSegmentIntersection, insidePolygon } from "../utils/MathUtils";
import { 
  addVertex, removeVertex, moveVertex, mergeRegions, splitRegionPointDirection, trimRegion, 
  removeRegion, addRegion, moveRegion, rotateRegion, 
  copiedRegion, copyRegion, pasteRegion, labelRegion } from "../utils/RegionEditing";
import { getTrajectoryColor } from "../utils/ColorUtils";

export default function(sketch) {
  // Current experiment
  let experiment = null,
      allRegions = null,
      visibleRegions = null;

  // Images
  let images = [],
      colorImages = [],
      frame = 0;

  // Interaction
  let onMouseWheel = null;

  // Segmentation
  let segmentationData = null;

  // Callbacks
  let onHighlightRegion = null,
      onSelectRegion = null,
      onSelectZoomPoint = null,
      onTranslate = null,
      onEditRegion = null,
      onLinkRegion = null,
      onLabelRegion = null;

  // Editing
  let editMode = "",
      handle = null,
      currentRegion = null,
      mergeRegion = null,
      activeRegions = [],
      moveHandle = false,
      moveMouse = false,
      // XXX: Need to keep the previous mouse position because mouse moved is firing on mouse pressed
      oldMouseX = -1, oldMouseY = -1,
      dragStartX = -1, dragStartY = -1,
      dragPointX = -1, dragPointY = -1,
      dragVertices = null,
      splitLine = null,
      actionString = "",
      currentLabel = "";

  // Transform
  let zoom = 1,
      zoomPoint = null,
      translation = [0, 0];

  // Appearance
  let lineWeight = 2,
      lineHighlightWeight = 3,
      handleRadius = 3,
      handleHighlightRadius = 5,
      doneOpacity = 0.2;

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
    currentLabel = props.currentLabel;
    doneOpacity = props.doneOpacity;
    onMouseWheel = props.onMouseWheel;
    onHighlightRegion = props.onHighlightRegion;
    onSelectRegion = props.onSelectRegion;
    onSelectZoomPoint = props.onSelectZoomPoint;
    onTranslate = props.onTranslate;
    onEditRegion = props.onEditRegion;
    onLinkRegion = props.onLinkRegion;
    onLabelRegion = props.onLabelRegion;

    if (editMode !== "regionSplit" && editMode !== "regionTrim") splitLine = null;

    // Check for new experiment
    if (!experiment || experiment.id !== props.experiment.id) {
      experiment = props.experiment;

      images = experiment.images.map(d => {    
        const w = d.image.width,
            h = d.image.height,
            im = sketch.createImage(w, h);

        im.copy(d.image, 0, 0, w, h, 0, 0, w, h);

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
    }

    if (segmentationData) {
      allRegions = segmentationData[frame].regions;

      // Find visible regions
      if (zoomPoint) {
        // Get visible area
        const z = 1 / zoom / 2,
              area = [zoomPoint[0] - z, zoomPoint[1] - z, 
                      zoomPoint[0] + z, zoomPoint[1] + z];

        const tree = segmentationData[frame].tree;

        visibleRegions = tree.search({
          minX: area[0], minY: area[1], maxX: area[2], maxY: area[3]
        }).map(d => d.region);       

        // XXX: Create new tree from visible regions for highlighting?
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

    sketch.textSize(8);
    sketch.textAlign(sketch.CENTER);
    sketch.textStyle(sketch.BOLD);

    // Get image
    const im = colorImages[frame];

    // Get regions    
    const regions = visibleRegions ? visibleRegions.slice() : null;
    if (regions && editMode === "regionPaste" && copiedRegion) regions.push(copiedRegion);

    // Set scale and translation
    let p = null;

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
    const handleColor = 200;
    const lineBackground = 0;

    sketch.strokeJoin(sketch.ROUND);

    if (regions) {
      regions.forEach(region => {
        if (region.vertices.length < 1) return;

        let color = d3.color(getTrajectoryColor(region.trajectory_id));

        color.opacity = 0.75;
        color = color.toString();

        const doneColor = 50;

        const highlightRegion =               
              region.highlight || 
              region === currentRegion || 
              region === mergeRegion ||
              activeRegions.indexOf(region) !== -1;

        let weight = highlightRegion ? lineHighlightWeight : lineWeight;
        weight /= zoom;

        const closedVertices = region.vertices.concat([region.vertices[0]]);

        sketch.push();
        if (region === copiedRegion) {
          const m = applyZoom([sketch.mouseX, sketch.mouseY]);
          const c = scalePoint(region.center);

          sketch.translate(m[0] - c[0], m[1] - c[1]);         
        }
        else {
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
        }

        // Draw outline
        sketch.stroke(region.done ? doneColor : color);
        sketch.strokeWeight(weight);        
        sketch.canvas.getContext("2d").setLineDash(region === copiedRegion ? [5 / zoom, 5 / zoom] : []);

        if (region.done) sketch.fill(doneColor, doneOpacity * 255);
        else sketch.noFill();

        sketch.beginShape();
        closedVertices.forEach(vertex => {
          const v = scalePoint(vertex);
          sketch.vertex(v[0], v[1]);
        });
        sketch.endShape();        

        const showVertices = 
          (editMode === "vertex" && region === currentRegion) || 
          (editMode === "regionMerge" && (region === mergeRegion || region === currentRegion)) ||
          editMode === "regionSplit" || 
          editMode === "regionTrim";

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

        // Draw labels
        if (region.labels && region.labels.length > 0) {
          sketch.noStroke();
          sketch.fill(region.done ? doneColor : color);

          const p = scalePoint([region.center[0], region.min[1]]);
          p[1] -= 5;

          const labels = region.labels.map(label => {
            return experiment.labels.indexOf(label) + 1;
          }).sort().join(", ");

          sketch.text(labels, p[0], p[1]);
        }
       
        sketch.pop();
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
    sketch.textStyle(sketch.NORMAL);
    sketch.text(actionString, sketch.width - fontSize / 2, sketch.height - fontSize / 2);
  }

  function mousePressed(e) {
    e.preventDefault();

    if (sketch.mouseButton && sketch.mouseButton !== sketch.LEFT) return;

    // Save mouse position
    oldMouseX = sketch.mouseX;
    oldMouseY = sketch.mouseY;
    moveMouse = false;

    if (editMode === "regionSplit" || editMode === "regionTrim") {
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
    else if (editMode === "regionSelect") {
      dragStartX = sketch.mouseX;
      dragStartY = sketch.mouseY;

      dragPointX = zoomPoint[0];
      dragPointY = zoomPoint[1];
    }
  }

  function mouseMoved(e) {
    e.preventDefault();

    actionString = "";

    if (sketch.mouseButton && sketch.mouseButton !== sketch.LEFT) return;

    activeRegions = [];

    // Check mouse position
    if (sketch.mouseX === oldMouseX && sketch.mouseY === oldMouseY) return;
    oldMouseX = sketch.mouseX;
    oldMouseY = sketch.mouseY;
    moveMouse = true;

    switch (editMode) {
      case "regionSelect":
        if (sketch.mouseIsPressed) {
          const m = [sketch.mouseX, sketch.mouseY];
          let v = [m[0] - dragStartX, m[1] - dragStartY];
          v = normalizePoint([v[0] / zoom, v[1] / zoom]);
          const p = [dragPointX - v[0], dragPointY - v[1]];

          onTranslate(p);
        }
        break;

      case "vertex":
        if (sketch.mouseIsPressed && handle) {
          moveHandle = true;
          sketch.noCursor();
          actionString = "Moving vertex";
        }

        if (moveHandle) {
          const m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));
          moveVertex(currentRegion, handle, m);
        }

        break;

      case "regionMerge":
      break;

//      case "regionSplit":
      case "regionTrim":
        if (sketch.mouseIsPressed) {
          const m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));
          splitLine[1] = m;

          // Highlight based on intersections with split line
          const tree = segmentationData[frame].tree;

          tree.search({
            minX: Math.min(splitLine[0][0], splitLine[1][0]),
            minY: Math.min(splitLine[0][1], splitLine[1][1]),
            maxX: Math.max(splitLine[0][0], splitLine[1][0]),
            maxY: Math.max(splitLine[0][1], splitLine[1][1])
          }).forEach(d => {
            const intersections = regionLineSegmentIntersections(d.region, splitLine);
            if (intersections > 0 && intersections % 2 === 0) activeRegions.push(d.region);
          });

          const numRegions = activeRegions.length;

          if (numRegions > 0) {
//            actionString = editMode === "regionSplit" ? "Split region" : "Trim region";
            actionString = "Trim region";
            if (numRegions > 1) actionString += "s";
          }
        }

        break;

      case "regionSplit":
        if (sketch.mouseIsPressed) {
          const m = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));
          splitLine[1] = m;
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
        break;

      case "regionLink":
      case "regionBreakLink":
        break;

      case "regionLabel":
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

      case "regionMerge":
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

      case "regionSplit":
          if (currentRegion) {
            const newRegion = splitRegionPointDirection(currentRegion, splitLine, 1.5 / images[0].width, allRegions);
  
            if (newRegion) {
              onEditRegion(frame, currentRegion);
              onEditRegion(frame, newRegion);
            }
          }
          
          splitLine = null;
  
          break;

/*        
      case "regionSplitPOINT":
        if (currentRegion) {
          const p = normalizePoint(applyZoom([sketch.mouseX, sketch.mouseY]));
          const newRegion = splitRegionWithPoint(currentRegion, p, 0.5 / images[0].width, allRegions);

          if (newRegion) {
            onEditRegion(frame, currentRegion);
            onEditRegion(frame, newRegion);
          }
        }

        break;

      case "regionSplitOLD":
        if (splitLine) {
          const editedRegions = [];

          activeRegions.forEach(region => {
            const newRegion = splitRegion(region, splitLine, 0.5 / images[0].width, allRegions);
            
            if (newRegion) {
              editedRegions.push(region);
              editedRegions.push(newRegion);
            }
          });

          editedRegions.forEach(region => {
            onEditRegion(frame, region);
          });
        }

        splitLine = null;        

        break;
*/
      case "regionTrim":
        if (splitLine) {
          const editedRegions = [];

          activeRegions.forEach(region => {
            if (trimRegion(region, splitLine)) {
              editedRegions.push(region);
            }
          });

          editedRegions.forEach(region => {
            onEditRegion(frame, region);
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

      case "regionLink":
        if (moveMouse) return;

        if (currentRegion) {
          onLinkRegion(frame, currentRegion);
        }
        else {
          onLinkRegion(-1, null)
        }

        break;

      case "regionBreakLink":
        if (moveMouse) return;

        if (currentRegion) {
          onLinkRegion(frame, currentRegion);
        }

        break;

      case "regionLabel":
        if (moveMouse) return;

        if (currentRegion) {
          onLabelRegion(frame, currentRegion, currentLabel);     
        }

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
    const im = images[0],
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
    if (editMode !== "vertex") currentRegion = null;
    if (editMode !== "regionMerge") mergeRegion = null;

    sketch.cursor(sketch.ARROW);

    switch (editMode) {
      case "regionEdit":
      case "regionMove":
      case "regionRotate":
      case "regionCopy":
      case "regionSelect":
      case "regionMerge":
      case "regionSplit":
      case "regionLink":
      case "regionBreakLink": 
      case "regionLabel": {
        actionString = 
          editMode === "regionEdit" ? "Add region" : 
          editMode === "regionSelect" ? "Center on point": ""; 

        // Test regions
        const p = normalizePoint(m);

        const tree = segmentationData[frame].tree;
        const nearest = knn(tree, p[0], p[1], 1, d => {
          return insidePolygon(p, d.region.vertices, [d.region.min, d.region.max]);
        });

        if (nearest.length > 0) {
          currentRegion = nearest[0].region;

          sketch.cursor(sketch.HAND);

          actionString = 
            editMode === "regionEdit" ? "Remove region" : 
            editMode === "regionMove" ? "Move region" :
            editMode === "regionRotate" ? "Rotate region" :
            editMode === "regionCopy" ? "Copy region" : 
            editMode === "regionMerge" && !mergeRegion ? "Select first merge region" :
            editMode === "regionMerge" && mergeRegion ? "Select second merge region" :
            editMode === "regionSplit" ? "Split region" :
            editMode === "regionLink" ? "Link region" :
            editMode === "regionBreakLink" ? "Break region link" :
            editMode === "regionSelect" ? "Center on region" : 
            editMode === "regionLabel" ? "Toggle " + currentLabel : ""; 
        }

        break;
      }

      case "vertex": {
        sketch.cursor(sketch.CROSS);

        // Test regions
        const p = normalizePoint(m);

        const tree = segmentationData[frame].tree;
        const nearest = knn(tree, p[0], p[1], 1, d => {
          return insidePolygon(p, d.region.vertices, [d.region.min, d.region.max]);
        });

        if (nearest.length > 0) {
          currentRegion = nearest[0].region;
        }

        // Radius
        const r = handleHighlightRadius / zoom;

        // Find closest point and line segment
        let closestVertex = null;
        let closestVertexDistance = null;

        if (currentRegion) {
          currentRegion.vertices.forEach(vertex => {
            const p1 = scalePoint(vertex);
            const dVertex = sketch.dist(m[0], m[1], p1[0], p1[1]);

            if (!closestVertexDistance || dVertex < closestVertexDistance) {
              closestVertex = vertex;
              closestVertexDistance = dVertex;
            }
          });

          actionString = "Add vertex";

          if (closestVertexDistance < r) {
            handle = closestVertex;
            sketch.cursor(sketch.HAND);

            actionString = "Remove vertex";
          }
        }        

        break;
      }

      case "regionPaste":
        actionString = "Paste region";
        break;

//      case "regionSplit":
//        break;

      case "regionTrim":
        break;
    }

    if (currentRegion !== previousRegion) {
      setTimeout(() => { onHighlightRegion(null, currentRegion); }, 0);
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
