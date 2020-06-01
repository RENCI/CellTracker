import * as d3 from "d3";

// Remove pale yellow
const colors = d3.schemePaired.slice();
colors.splice(10, 1);

const colorScale = d3.scaleOrdinal().range(colors);

const trajectoryColors = {};

let index = 0;

export function getAllTrajectoryColors() {
  return {...trajectoryColors};
}

export function setTrajectoryColor(trajectoryId, color) {
  if (color) {
    trajectoryColors[trajectoryId] = color;
  }
  else {
    const newColor = colorScale(index);

    index = (index + 1) % colors.length;

    trajectoryColors[trajectoryId] = newColor;
  }
}

export function setValidTrajectoryColor(trajectoryId, excludedColors) {
  for (let i = 0; i < colors.length; i++) {
    const newColor = colorScale(index);

    index = (index + 1) % colors.length;

    if (!excludedColors.includes(newColor)) {
      trajectoryColors[trajectoryId] = newColor;
      return;
    }
  }
}

export function getTrajectoryColor(trajectoryId) {
  const color = trajectoryColors[trajectoryId];

  if (!color) {
    console.log("Invalid trajectory id");
    return "#fff";
  }

  return color;
}