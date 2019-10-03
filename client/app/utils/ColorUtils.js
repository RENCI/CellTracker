import * as d3 from "d3";

// Remove pale yellow
const regionColors = d3.schemePaired.slice();
regionColors.splice(10, 1);

export { regionColors };