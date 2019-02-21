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

function mergeRegions(region1, region2, dilation, regionArray) {
  // Dilate the two regions
  let dilate1 = dilate(region1.vertices, dilation);
  let dilate2 = dilate(region2.vertices, dilation);

  // Nullify points in the dilation intersection
  let valid1 = region1.vertices.map(function(v) {
    return MathUtils.insidePolygon(v, dilate2) ? null : v;
  });

  let valid2 = region2.vertices.map(function(v) {
    return MathUtils.insidePolygon(v, dilate1) ? null : v;
  });

  if (valid1.indexOf(null) === -1 || valid2.indexOf(null) === -1) {
    // Get non-null vertices
    valid1 = valid1.filter(function(d) { return d !== null; });
    valid2 = valid2.filter(function(d) { return d !== null; });

    // Find two closest point pairs and merge them
    let pairs = [];
    valid1.forEach(function(v1, i) {
      valid2.forEach(function(v2, j) {
        pairs.push({
          i: i,
          j: j,
          d2: MathUtils.distance2(v1, v2)
        });
      });
    });

    pairs.sort(function(a, b) {
      return a.d2 - b.d2;
    });

    let pair1 = pairs[0];
    let pair2;
    for (let i = 1; i < pairs.length; i++) {
      let p = pairs[i];

      if (p.i !== pair1.i && p.j !== pair1.j) {
        pair2 = p;
        break;
      }
    }

    // Sort by lowest i index
    if (pair1.i > pair2.i) {
      let temp = pair1;
      pair1 = pair2;
      pair2 = temp;
    }

    function mergePoints(p1, p2) {
      return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    }

    // Merge regions
    let merged = [];

    for (let i = 0; i < pair1.i; i++) {
      merged.push(valid1[i]);
    }

    merged.push(mergePoints(valid1[pair1.i], valid2[pair1.j]));

    // XXX: Refactor to reduce redundancy with above code
    for (let i = 0; i < valid2.length; i++) {
      let j = (i + pair1.j + 1) % valid2.length;

      if (j === pair2.j) break;

      merged.push(valid2[j]);
    }

    merged.push(mergePoints(valid1[pair2.i], valid2[pair2.j]));

    for (let i = pair2.i + 1; i < valid1.length; i++) {
      merged.push(valid1[i]);
    }

    // Update the vertices
    setVertices(region1, merged);

    // Remove the other region
    regionArray.splice(regionArray.indexOf(region2), 1);
  }
  else {
    // Merge regions
    let merged = [];
    let mergeStart;
    for (let i = 0; i < valid1.length; i++) {
      let v1 = valid1[i];

      if (v1) {
        // Add this one
        merged.push(v1);

        let v2 = valid1[(i + 1) % valid1.length];

        if (!v2) {
          // Find closest merge point
          let closest = valid2.reduce(function(p, c, i) {
            if (!c) return p;

            let d2 = MathUtils.distance2(v1, c);

            return p === null || d2 < p.d2 ? {
              i: i,
              d2: d2
            } : p;
          }, null);

          mergeStart = closest.i;

          valid1[i] = null;

          break;
        }
      }

      valid1[i] = null;
    }

    // XXX: Refactor to reduce redundancy with above code
    let selectedStart;
    for (let i = 0; i < valid2.length; i++) {
      let i1 = (i + mergeStart) % valid2.length;

      let v1 = valid2[i1];

      if (v1) {
        // Add this one
        merged.push(v1);

        let v2 = valid2[(i1 + 1) % valid2.length];

        if (!v2) {
          // Find closest merge point
          console.log(valid1);
          console.log(valid2);

          let closest = valid1.reduce(function(p, c, i) {
            if (!c) return p;

            let d2 = MathUtils.distance2(v1, c);

            return p === null || d2 < p.d2 ? {
              i: i,
              d2: d2
            } : p;
          }, null);

          if (!closest) {
            console.log(valid1);
            console.log(valid2);
            console.log(merged);
          }

          selectedStart = closest.i;

          valid2[i1] = null;

          break;
        }
      }

      valid2[i1] = null;
    }

    for (let i = selectedStart; i < valid1.length; i++) {
      let v = valid1[i];

      if (v) merged.push(v);
      //else break;
    }

    // Update the vertices
    setVertices(region1, merged);

    // Remove the other region
    regionArray.splice(regionArray.indexOf(region2), 1);
  }

  function dilate(vertices, alpha) {
    return vertices.map(function(v, i, a) {
      // Get neighbors
      const v1 = i === 0 ? a[a.length - 1] : a[i - 1];
      const v2 = i === a.length - 1 ? a[0] : a[i + 1];

      // Get normals
      const n1 = MathUtils.normalizeVector([v[1] - v1[1], -(v[0] - v1[0])]);
      const n2 = MathUtils.normalizeVector([v2[1] - v[1], -(v2[0] - v[0])]);
      const n = [(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2];

      // Dilate
      return [v[0] + n[0] * alpha, v[1] + n[1] * alpha];
    });
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
  }
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

    // Keep region with most vertices
    if (v1.length > v2.length) {
      setVertices(region, v1);
    }
    else if (v2.length > v1.length) {
      setVertices(region, v2);
    }
  }
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
