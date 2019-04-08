var d3 = require("d3");

module.exports = function() {
      // Size
  let margin = { top: 5, left: 5, bottom: 5, right: 5 },
      width = 200,
      height = 200,
      innerWidth = function() { return width - margin.left - margin.right; },
      innerHeight = function() { return height - margin.top - margin.bottom; },

      // Data
      data,

      // Start with empty selection
      svg = d3.select(),

      // Event dispatcher
      dispatcher = d3.dispatch("selectPhase", "selectSpecies");

  function trajectoryGraph(selection) {
    selection.each(function(d) {
      data = d;

      console.log(data);

      // Create skeletal chart
      svg = d3.select(this).selectAll("svg")
          .data([data]);

      const svgEnter = svg.enter().append("svg")
          .attr("class", "trajectoryGraph");

      const g = svgEnter.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // Groups for layout
      g.append("g").attr("class", "links");
      g.append("g").attr("class", "nodes");

      svg = svgEnter.merge(svg);

      draw();
    });
  }

  function draw() {
    // Set width and height
    svg .attr("width", width)
        .attr("height", height);

    // Draw the visualization
    drawLinks();
    drawNodes();

    function drawLinks() {

    }

    function drawNodes() {

    }
  }

  trajectoryGraph.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return trajectoryGraph;
  };

  trajectoryGraph.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return trajectoryGraph;
  };

  // For registering event callbacks
  trajectoryGraph.on = function() {
    const value = dispatcher.on.apply(dispatcher, arguments);
    return value === dispatcher ? trajectoryGraph : value;
  };

  return trajectoryGraph;
}
