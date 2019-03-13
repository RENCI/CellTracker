let MathUtils = require("./MathUtils");

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

  const minDist1 = vertices1.map(() => null);

  // Compute distances for each pair
  let pairs = [];
  vertices1.forEach((v1, i) => {
    vertices2.forEach((v2, j) => {
      const dist = MathUtils.distance(v1, v2);

      pairs.push({
        v1: v1,
        v2: v2,
        i: i,
        j: j,
        dist: dist
      });

      if (minDist1[i] === null || dist < minDist1[i]) minDist1[i] = dist;
    });
  });

  // Get the starting vertex on region 1
  const startIndex = minDist1.reduce((p, c, i, a) => {
    return c < a[p] ? i : p;
  });

  // Sort pairs
  pairs.sort((a, b) => a.dist - b.dist);

  // Compute distance threshold
  // XXX: Maybe look at using Otsu thresholding to determine threshold?
  const threshold = pairs[1].dist * 2;

  // Compute midpoints for possible merge points
  pairs = pairs.filter(d => d.dist < threshold);
  pairs.forEach(d => {
    d.midPoint = mergePoints(d.v1, d.v2);
  });

  // Compute distances between midpoints
  let midPairs = [];
  pairs.forEach(p1 => {
    pairs.forEach(p2 => {
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
  const p1 = midPairs[0].p1;
  const p2 = midPairs[0].p2;

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

  function left(i, a) {
    return i === 0 ? a.length - 1 : i - 1;
  }

  function right(i, a) {
    return i === a.length - 1 ? 0 : i + 1;
  }
}

function splitRegion(region, line, offset, regionArray) {
  // Find intersections with region line segments
  let vertices = region.vertices;
  let intersections = [];

  for (let i = 0; i < vertices.length; i++) {
    let v1 = vertices[i],
        v2 = vertices[i === vertices.length - 1 ? 0 : i + 1];

    let p = MathUtils.lineSegmentIntersection(line[0], line[1], v1, v2);

    if (p) {
      intersections.push({
        index: i,
        point: p
      });
    }
  }

  if (intersections.length === 2) {
    // Split into two regions
    let v1 = [];
    let v2 = [];

    for (let i = 0; i < vertices.length; i++) {
      let v = vertices[i];

      if (i === intersections[0].index) {
        let p = intersections[0].point;

        let x = MathUtils.normalizeVector([p[0] - v[0], p[1] - v[1]]);
        x[0] *= offset;
        x[1] *= offset;

        v1.push(v);
        v1.push([p[0] - x[0], p[1] - x[1]]);

        v2.push([p[0] + x[0], p[1] + x[1]]);
      }
      else if (i === intersections[1].index) {
        let p = intersections[1].point;

        let x = MathUtils.normalizeVector([p[0] - v[0], p[1] - v[1]]);
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

    // Set vertices on original region and add new one
    let newRegion = {
      id: "object" + regionArray.length,
      selected: false
    };

    setVertices(region, v1);
    setVertices(newRegion, v2);

    regionArray.push(newRegion);

    return newRegion;
  }

  return null;
}

function trimRegion(region, line) {
  // Find intersections with region line segments
  let vertices = region.vertices;
  let intersections = [];

  for (let i = 0; i < vertices.length; i++) {
    let v1 = vertices[i],
        v2 = vertices[i === vertices.length - 1 ? 0 : i + 1];

    let p = MathUtils.lineSegmentIntersection(line[0], line[1], v1, v2);

    if (p) {
      intersections.push({
        index: i,
        point: p
      });
    }
  }

  if (intersections.length === 2) {
    // Split into two regions
    let v1 = [];
    let v2 = [];

    for (let i = 0; i < vertices.length; i++) {
      let v = vertices[i];

      if (i > intersections[0].index && i <= intersections[1].index) {
        v2.push(v);
      }
      else {
        v1.push(v);
      }
    }

    console.log(v1, v2);

    // Keep region with most vertices
    if (v1.length > v2.length) {
      setVertices(region, v1);
    }
    else {
      setVertices(region, v2);
    }

    return true;
  }

  return false;
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
    id: "object" + regionArray.length,
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
