function distance(p1, p2) {
  return Math.sqrt(distance2(p1, p2));
}

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
    return distance(p, p1);
  }

  // Compute u
  var u = ((p[0] - p1[0]) * (p2[0] - p1[0]) + (p[1] - p1[1]) * (p2[1] - p1[1])) /
          (Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));

  // Test u
  if (u >= 0 && u <= 1) {
    // In line segement, return closest point on line
    var p3 = [ p1[0] + u * (p2[0] - p1[0]),
               p1[1] + u * (p2[1] - p1[1]) ];

    return distance(p, p3);
  }
  else {
    // Return closest line segment end point
    return Math.min(distance(p, p1), distance(p, p2));
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

module.exports = {
  normalizeVector: normalizeVector,
  distance2: distance2,
  insidePolygon: insidePolygon,
  pointLineSegmentDistance: pointLineSegmentDistance,
  lineSegmentIntersection: lineSegmentIntersection
};
