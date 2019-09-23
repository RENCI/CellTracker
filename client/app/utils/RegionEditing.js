import * as d3 from "d3";
import { 
  distance, distance2, normalizeVector, 
  lineSegmentIntersection, pointLineSegmentDistance, pointLineSegmentClosestPoint
} from "./MathUtils";

function left(i, a) {
  return i === 0 ? a.length - 1 : i - 1;
}

function right(i, a) {
  return i === a.length - 1 ? 0 : i + 1;
}

function generateId(regions) {
  const s = "object";
  const maxId = d3.max(regions, d => +d.id.replace(s, ""));

  return s + (maxId + 1);
} 

function setVertices(region, vertices) {
  region.vertices = vertices;

  updateExtent(region);
}

function regionCenter(region) {
  return [
    (region.min[0] + region.max[0]) / 2,
    (region.min[1] + region.max[1]) / 2
  ];
}

function updateExtent(region) {
  const vertices = region.vertices;

  const x = vertices.map(vertex => vertex[0]);
  const y = vertices.map(vertex => vertex[1]);
 
  region.min = [
    x.reduce((p, c) => Math.min(p, c)),
    y.reduce((p, c) => Math.min(p, c))
  ];
 
  region.max = [
    x.reduce((p, c) => Math.max(p, c)),
    y.reduce((p, c) => Math.max(p, c))
  ];
 
  region.center = regionCenter(region);
}

function updateExtentFromVertex(region, vertex) {
  if (vertex[0] < region.min[0]) region.min[0] = vertex[0];
  else if (vertex[0] > region.max[0]) region.max[0] = vertex[0];

  if (vertex[1] < region.min[1]) region.min[1] = vertex[1];
  else if (vertex[1] > region.max[1]) region.max[1] = vertex[1];

  region.center = regionCenter(region);
}

export function removeVertex(region, vertex) {
  let vertices = region.vertices;

  if (vertices.length <= 3) return false;

  const i = vertices.indexOf(vertex);

  if (i !== -1) {
    vertices.splice(i, 1);
    updateExtent(region);

    return true;
  }

  return false;
}

export function addVertex(region, point) {
  let vertices = region.vertices;

  // Get indeces for pairs of vertices
  let segments = vertices.reduce((p, c, i, a) => {
    if (i === a.length - 1) p.push([i, 0]);
    else p.push([i, i + 1]);
    return p;
  }, []);

  // Find closest line segment to this point
  let segment = segments.reduce((p, c, i) => {
    let d = pointLineSegmentDistance(point, vertices[c[0]], vertices[c[1]]);
    return d < p.d ? { d: d, i: i } : p;
  }, { d: 1.0, i: -1 });

  // Insert new point
  vertices.splice(segments[segment.i][1], 0, point);

  updateExtentFromVertex(region, point);
}

export function moveVertex(region, vertex, position) {
  vertex[0] = position[0];
  vertex[1] = position[1];

  updateExtentFromVertex(region, vertex);
}

export function mergeRegions(region1, region2, regionArray) {
  // Keep track of minimum distance for each vertex in region 1
  const vertices1 = region1.vertices;
  const vertices2 = region2.vertices;

  // Compute all distances from region 1 vertices to region 2 vertices
  let pairs = [];
  vertices1.forEach((v1, i) => {
    vertices2.forEach((v2, j) => {
      pairs.push({
        v1: v1,
        v2: v2,
        i: i,
        j: j,
        dist: distance(v1, v2)
      });
    });
  });

  // Sort pairs
  pairs.sort((a, b) => a.dist - b.dist);

  // Compute distance threshold
  // XXX: Maybe look at using Otsu thresholding to determine threshold?
  //const threshold = d3.quantile(pairs.map(p => p.dist), 0.1);
  const threshold = pairs[1].dist * 1.25;

  // Get the starting vertex on region 1
  const startIndex = pairs[pairs.length - 1].i;

  // Threshold pairs
  const thresholdPairs = pairs.filter(d => d.dist < threshold);

  // Make sure there are at least 2 distinct vertices for each region
  function unique(a) {
    return a.reduce((p, c) => {
      if (p.indexOf(c) === -1) p.push(c);
      return p;
    }, []);
  }

  const unique1 = unique(thresholdPairs.map(p => p.i));
  const unique2 = unique(thresholdPairs.map(p => p.j));

  if (unique1.length === 1) {
    for (let i = thresholdPairs.length; i < pairs.length; i++) {
      let p = pairs[i];

      if (p.i !== unique1[0]) {
        thresholdPairs.push(p);
        break;
      }
    }
  }
  else if (unique2.length === 1) {
    for (let i = thresholdPairs.length; i < pairs.length; i++) {
      let p = pairs[i];

      if (p.j !== unique2[0]) {
        thresholdPairs.push(p);
        break;
      }
    }
  }

  // Compute midpoints for possible merge points
  thresholdPairs.forEach(d => {
    d.midPoint = mergePoints(d.v1, d.v2);
  });

  // Compute distances between midpoints
  let midPairs = [];
  thresholdPairs.forEach(p1 => {
    thresholdPairs.forEach(p2 => {
      if (p1 !== p2) midPairs.push({
        p1: p1,
        p2: p2,
        dist2: distance2(p1.midPoint, p2.midPoint)
      });
    });
  });

  // Sort
  midPairs.sort((a, b) => b.dist2 - a.dist2);

  // Final merge pairs
  let p1 = null;
  let p2 = null;
  for (let i = 0; i < midPairs.length; i++) {
    const mp = midPairs[i];

    if (mp.p1.i !== mp.p2.i && mp.p1.j !== mp.p2.j) {
      p1 = mp.p1;
      p2 = mp.p2;

      break;
    }
  } 
  
  if (!p1) {
    console.log("PROBLEM");
    return;
  }

  // Do the merge
  const vertices = [];

  let pFirst = null;
  let pSecond = null;

  for (let i = startIndex; i !== left(startIndex, vertices1); i = right(i, vertices1)) {
    vertices.push(vertices1[i]);

    if (i === p1.i) {
      pFirst = p1;
      pSecond = p2;
      break;
    }
    else if (i === p2.i) {
      pFirst = p2;
      pSecond = p1;
      break;
    }
  }

  for (let j = pFirst.j; j !== pSecond.j; j = right(j, vertices2)) {
    vertices.push(vertices2[j]);
  }

  for (let i = pSecond.i; i !== startIndex; i = right(i, vertices1)) {
    vertices.push(vertices1[i]);
  }

  // Update the vertices
  setVertices(region1, vertices);

  // Remove the other region
  regionArray.splice(regionArray.indexOf(region2), 1);

  function mergePoints(p1, p2) {
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  }
}

export function splitRegion(region, line, offset, regionArray) {
  // Find intersections with region line segments
  const vertices = region.vertices;
  let intersections = [];

  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i],
        v2 = vertices[i === vertices.length - 1 ? 0 : i + 1];

    const p = lineSegmentIntersection(line[0], line[1], v1, v2);

    if (p) {
      intersections.push({
        index: i,
        point: p
      });
    }
  }

  if (intersections.length % 2 === 1) return null;

  // Create sections between each intersection
  let sections = [[]];
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];

    // Add vertex
    sections[sections.length - 1].push(v);

    // Check for intersection
    for (let j = 0; j < intersections.length; j++) {
      const ix = intersections[j];

      if (i === ix.index) {
        // Compute offset from intersection point
        const x = normalizeVector([ix.point[0] - v[0], ix.point[1] - v[1]]);
        x[0] *= offset;
        x[1] *= offset;

        const p1 = [ix.point[0] - x[0], ix.point[1] - x[1]];
        const p2 = [ix.point[0] + x[0], ix.point[1] + x[1]];

        // Add intersection point
        sections[sections.length - 1].push(p1);

        // Start new section
        sections.push([p2]);        

        break;
      }
    }
  }

  // Combine first and last sections
  sections[0] = sections.pop().concat(sections[0]);

  // Combine every other section
  let vertices1 = [];
  let vertices2 = [];
  sections.forEach((section, i) => {
    if (i % 2 === 0) vertices1 = vertices1.concat(section);
    else vertices2 = vertices2.concat(section);
  });

  // Set vertices on original region and add new one
  const newRegion = {
    id: generateId(regionArray),
    selected: false
  };

  setVertices(region, vertices1);
  setVertices(newRegion, vertices2);

  regionArray.push(newRegion);

  return newRegion;
}

export function splitRegionWithPoint(region, point, offset, regionArray) {
  const vertices = region.vertices;

  // Find closest line segment
  let minDistance = Number.MAX_VALUE;
  let segment1 = null;
  let closestPoint = null;

  for (let i = 0; i < vertices.length; i++) {
    const j = i === vertices.length - 1 ? 0 : i + 1;

    const v1 = vertices[i],
          v2 = vertices[j];

    const p = pointLineSegmentClosestPoint(point, v1, v2);
    const d = distance(point, p);

    if (d < minDistance) {
      minDistance = d;
      segment1 = [i, j];
      closestPoint = p;
    }
  }

  // Find closest line segment in the other direction
  // Normalized vector should be long enough, as we are operating in normalized coordinates
  const v = normalizeVector([point[0] - closestPoint[0], point[1] - closestPoint[1]]);
  const lineStart = point;
  const lineEnd = [point[0] + v[0], point[1] + v[1]];

  minDistance = Number.MAX_VALUE;
  let segment2 = null;
  closestPoint = null;

  for (let i = 0; i < vertices.length; i++) {
    const j = i === vertices.length - 1 ? 0 : i + 1;

    if (i === segment1[0] && j === segment1[1]) continue;

    const v1 = vertices[i],
          v2 = vertices[j];

    const p = lineSegmentIntersection(lineStart, lineEnd, v1, v2);

    if (p) {
      const d = distance(point, p);

      if (d < minDistance) {
        minDistance = d;
        segment2 = [i, j];
        closestPoint = p;
      }
    }
  }

  // Perpendicular vector
  const v2 = [v[1], -v[0]];
  v2[0] *= offset;
  v2[1] *= offset;

  const vertices1 = [[point[0] + v2[0], point[1] + v2[1]]];
  for (let i = segment1[1]; i !== segment2[0]; i = (i + 1) % (vertices.length)) {
    vertices1.push(vertices[i]);
  }
  vertices1.push(vertices[segment2[0]]);

  const vertices2 = [[point[0] - v2[0], point[1] - v2[1]]];
  for (let i = segment2[1]; i !== segment1[0]; i = (i + 1) % (vertices.length)) {
    vertices2.push(vertices[i]);
  }
  vertices2.push(vertices[segment1[0]]);

  // Set vertices on original region and add new one
  const newRegion = {
    id: generateId(regionArray),
    selected: false
  };

  setVertices(region, vertices1);
  setVertices(newRegion, vertices2);

  regionArray.push(newRegion);

  return newRegion;
}

export function trimRegion(region, line) {
  // Find intersections with region line segments
  const vertices = region.vertices;
  let intersections = [];

  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i],
        v2 = vertices[i === vertices.length - 1 ? 0 : i + 1];

    const p = lineSegmentIntersection(line[0], line[1], v1, v2);

    if (p) {
      intersections.push({
        index: i,
        point: p
      });
    }
  }

  if (intersections.length % 2 === 1) return false;

  // Create sections between each intersection
  let sections = [[]];
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];

    // Add vertex
    sections[sections.length - 1].push(v);

    // Check for intersection
    for (let j = 0; j < intersections.length; j++) {
      const ix = intersections[j];

      if (i === ix.index) {
        // Add intersection point
        sections[sections.length - 1].push(ix.point);

        // Start new section
        sections.push([ix.point]);        

        break;
      }
    }
  }

  // Combine first and last sections
  sections[0] = sections.pop().concat(sections[0]);

  // Get longest section
  const longest = sections.reduce((p, c, i) => {
    const length = c.reduce((p, c, i, a) => {
      return p + distance(c, a[right(i, a)]);
    }, 0);

    return !p || length > p.length ? {
      index: i,
      length: length
    } : p;
  }, null);

  // Get every other section
  sections = sections.filter((s, i) => {
    return i % 2 === longest.index % 2;
  });

  // Merge arrays
  const newVertices = [].concat.apply([], sections);

  // Set the vertices
  setVertices(region, newVertices);

  return true;
}

export function removeRegion(region, regionArray) {
  regionArray.splice(regionArray.indexOf(region), 1);
}

export function addRegion(point, radius, regionArray) {
  // Equilateral triangle  
/*  
  const a = Math.PI / 6;
  const x = Math.cos(a) * radius;
  const y = Math.sin(a) * radius;

  const region = {
    center: point,
    id: generateId(regionArray),
    min: [point[0] - radius, point[1] - radius],
    max: [point[0] + radius, point[1] + radius],
    selected: false,
    vertices: [
      [point[0] + x, point[1] + y],
      [point[0] - x, point[1] + y],
      [point[0], point[1] - radius]
    ]
  };
*/

  // Point
  const region = {
    center: point.slice(),
    id: generateId(regionArray),
    min: point.slice(),
    max: point.slice(),
    selected: false,
    vertices: [ point.slice() ]
  };

  regionArray.push(region);

  return region;
}

export function moveRegion(region, originalVertices, dx, dy) {
  const vertices = originalVertices.map(vertex => {
    return [vertex[0] + dx, vertex[1] + dy];
  });

  setVertices(region, vertices);
}

export function rotateRegion(region, originalVertices, theta) {
  const center = region.center.slice();

  const vertices = originalVertices.map(vertex => {
    const x = vertex[0]- center[0],
          y = vertex[1] - center[1],
          c = Math.cos(theta),
          s = Math.sin(theta);

    return [x * c - y * s + center[0], y * c + x * s + center[1]];
  });

  setVertices(region, vertices);

  region.center = center;
}

export let copiedRegion = null;

export function copyRegion(region) {
  copiedRegion = {
    center: region.center.slice(),
    min: region.min.slice(),
    max: region.max.slice(),
    vertices: region.vertices.slice()
  };
}

export function pasteRegion(center, regionArray) {
  const dx = center[0] - copiedRegion.center[0],
        dy = center[1] - copiedRegion.center[1];

  const newRegion = {
    center: center.slice(),
    id: generateId(regionArray),
    min: [copiedRegion.min[0] + dx, copiedRegion.min[1] + dy],
    max: [copiedRegion.max[0] + dx, copiedRegion.max[1] + dy],
    selected: false,
    vertices: copiedRegion.vertices.map(vertex => {
      return [vertex[0] + dx, vertex[1] + dy];
    })
  };

  regionArray.push(newRegion);

  return newRegion;
}
