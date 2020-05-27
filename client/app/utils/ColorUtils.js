import * as d3 from "d3";

// Remove pale yellow
const colors = d3.schemePaired.slice();
colors.splice(10, 1);

const colorScale = d3.scaleOrdinal().range(colors);

const trajectoryColors = {};

let index = 0;

export function setTrajectoryColor(trajectoryId) {
  if (trajectoryColors[trajectoryId]) return;

  const color = colorScale(index);

  index = (index + 1) % colors.length;

  trajectoryColors[trajectoryId] = color;
}

export function getTrajectoryColor(trajectoryId) {
  const color = trajectoryColors[trajectoryId];

  if (!color) {
    console.log("Invalid trajectory id");
    return "#fff";
  }

  return color;
}