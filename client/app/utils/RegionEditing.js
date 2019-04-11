let MathUtils = require("./MathUtils");
let d3 = require("d3");

function left(i, a) {
  return i === 0 ? a.length - 1 : i - 1;
}

function right(i, a) {
  return i === a.length - 1 ? 0 : i + 1;
}

function generateId(regions) {
  const s = "object";
  const ids = regions.map(d => +d.id.replace(s, "")).sort(d3.ascending);

  return s + (ids[ids.length - 1] + 1);
} 

function setVertices(region, vertices) {
  region.vertices = vertices;

  // Get extent
  let x = vertices.map(function (vertex) { return vertex[0]; });
  let y = vertices.map(function (vertex) { return vertex[1]; });

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

function removeVertex(region, vertex) {
  let vertices = region.vertices;

  if (vertices.length <= 3) return false;

  const i = vertices.indexOf(vertex);

  if (i !== -1) {
    vertices.splice(i, 1);
    return true;
  }

  return false;
}

function addVertex(region, point) {
  let vertices = region.vertices;

  // Get indeces for pairs of vertices
  let segments = vertices.reduce(function(p, c, i, a) {
    if (i === a.length - 1) p.push([i, 0]);
    else p.push([i, i + 1]);
    return p;
  }, []);

  // Find closest line segment to this point
  let segment = segments.reduce(function(p, c, i) {
    let d = MathUtils.pointLineSegmentDistance(point, vertices[c[0]], vertices[c[1]]);
    return d < p.d ? { d: d, i: i } : p;
  }, { d: 1.0, i: -1 });

  // Insert new point
  vertices.splice(segments[segment.i][1], 0, point);
}

function mergeRegions(region1, region2, regionArray) {
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
        dist: MathUtils.distance(v1, v2)
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
        dist2: MathUtils.distance2(p1.midPoint, p2.midPoint)
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

function splitRegion(region, line, offset, regionArray) {
  // Find intersections with region line segments
  const vertices = region.vertices;
  let intersections = [];

  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i],
        v2 = vertices[i === vertices.length - 1 ? 0 : i + 1];

    const p = MathUtils.lineSegmentIntersection(line[0], line[1], v1, v2);

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
        const x = MathUtils.normalizeVector([ix.point[0] - v[0], ix.point[1] - v[1]]);
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

function trimRegion(region, line) {
  // Find intersections with region line segments
  const vertices = region.vertices;
  let intersections = [];

  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i],
        v2 = vertices[i === vertices.length - 1 ? 0 : i + 1];

    const p = MathUtils.lineSegmentIntersection(line[0], line[1], v1, v2);

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
      return p + MathUtils.distance(c, a[right(i, a)]);
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

function removeRegion(region, regionArray) {
  regionArray.splice(regionArray.indexOf(region), 1);
}

function addRegion(point, radius, regionArray) {
  // Equilateral triangle
  const a = Math.PI / 6;
  const x = Math.cos(a) * radius;
  const y = Math.sin(a) * radius;

  let region = {
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

  regionArray.push(region);

  return region;
}

module.exports = {
  removeVertex: removeVertex,
  addVertex: addVertex,
  mergeRegions: mergeRegions,
  splitRegion: splitRegion,
  trimRegion: trimRegion,
  removeRegion: removeRegion,
  addRegion: addRegion
};
