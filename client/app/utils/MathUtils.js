function vectorMagnitude(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

export function normalizeVector(v) {
  const mag = vectorMagnitude(v);

  return mag === 0 ? [0, 0] : [v[0] / mag, v[1] / mag];
}

export function distance(p1, p2) {
  return Math.sqrt(distance2(p1, p2));
}

export function distance2(p1, p2) {
  const x = p1[0] - p2[0],
        y = p1[1] - p2[1];

  return x * x + y * y;
}

// Adapted from: http://paulbourke.net/geometry/polygonmesh/
export function insidePolygon(p, polygon, bb) {
  if (polygon.length <= 2) return true;

  // Check bounding box
  if (p[0] < bb[0][0] || p[0] > bb[1][0] ||
      p[1] < bb[0][1] || p[1] > bb[1][1]) return false;

  const n = polygon.length
  let counter = 0;

  let p0 = polygon[0];

  for (let i = 1; i <= n; i++) {
    const p1 = polygon[i % n];

    if (p[1] > Math.min(p0[1], p1[1])) {
      if (p[1] <= Math.max(p0[1], p1[1])) {
        if (p[0] <= Math.max(p0[0], p1[0])) {
          if (p0[1] !== p1[1]) {
            const xInt = (p[1] - p0[1]) * (p1[0] - p0[0]) / (p1[1] - p0[1]) + p0[0];

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
export function pointLineSegmentDistance(p, p1, p2) {
  return distance(p, pointLineSegmentClosestPoint(p, p1, p2));
}

export function pointLineSegmentClosestPoint(p, p1, p2) {
  // Check for coincident p1 and p2
  if (p1[0] === p2[0] && p1[1] === p2[1]) {
    // Return one of the points
    return p1.slice();
  }

  // Compute u
  const u = ((p[0] - p1[0]) * (p2[0] - p1[0]) + (p[1] - p1[1]) * (p2[1] - p1[1])) /
            (Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));

  // Test u
  if (u >= 0 && u <= 1) {
    // In line segement, return closest point on line
    const p3 = [ p1[0] + u * (p2[0] - p1[0]),
                 p1[1] + u * (p2[1] - p1[1]) ];

    return p3;
  }
  else {
    // Return closest line segment end point
    return distance(p, p1) < distance(p, p2) ? p1.slice() : p2.slice();
  }
}

// Return intersection point of two line segments
// Based on technique described here: http://paulbourke.net/geometry/pointlineplane/
export function lineSegmentIntersection(p1, p2, p3, p4) {
  // Check that none of the lines are of length 0
	if ((p1[0] === p2[0] && p1[1] === p2[1]) || (p3[0] === p4[0] && p3[1] === p4[1])) {
		return false;
	}

	const denominator = ((p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1]));

  // Lines are parallel
	if (denominator === 0) {
		return null;
	}

	const ua = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) / denominator,
	      ub = ((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) / denominator;

  // Is the intersection along the segments?
	if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
		return null;
	}

  // Return the x and y coordinates of the intersection
	const x = p1[0] + ua * (p2[0] - p1[0]),
	      y = p1[1] + ua * (p2[1] - p1[1]);

	return [x, y];
}