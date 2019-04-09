var d3 = require("d3");
var d3ScaleChromatic = require("d3-scale-chromatic");
var d3Sankey = require("d3-sankey");

module.exports = function() {
      // Size
  let margin = { top: 5, left: 5, bottom: 5, right: 5 },
      width = 200,
      height = 200,
      innerWidth = function() { return width - margin.left - margin.right; },
      innerHeight = function() { return height - margin.top - margin.bottom; },

      // Data
      data,
      graph = {},

      // Start with empty selection
      svg = d3.select(),

      // Event dispatcher
      dispatcher = d3.dispatch("selectPhase", "selectSpecies");

  function trajectoryGraph(selection) {
    selection.each(function(d) {
      data = d;

      processData();

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

  function processData() {
    // Mimic d3 Sankey, but enforce x-positions on nodes based on frame

    // Create nodes from regions
    let nodes = data.segmentationData.map((frame, i) => {
      const frameNodes = {};

      frame.regions.forEach(region => {
        const nodeId = id(i, region.id);

        frameNodes[region.id] = {
          region: region,
          id: nodeId,
          frameIndex: i,
          sourceLinks: [],
          targetLinks: []
        };
      });

      return frameNodes;
    });

    // Link nodes
    const links = [];

    nodes.slice(0, -1).forEach((frameNodes, i) => {
      d3.values(frameNodes).forEach(source => {
        if (source.region.link_id) {
          const target = nodes[i + 1][source.region.link_id];

          if (!target) {
            console.log("Invalid link_id: " + source.region.link_id);
            return;
          }

          const link = {
            source: source,
            target: target,
            value: 1
          };

          source.sourceLinks.push(link);
          target.targetLinks.push(link);

          links.push(link);
        }
      })
    });

    // Convert each node frame to arrays after linking
    nodes = nodes.map((d, i) => {
      return d3.values(d).sort((a, b) => {
        if (i === nodes.length - 1) {
          return d3.ascending(a.region.trajectory_id, b.region.trajectory_id);
        }

        const a_link = nodes[i + 1][a.region.link_id];
        const b_link = nodes[i + 1][b.region.link_id];

        const a_id = a_link ? a_link.region.trajectory_id : a.region.trajectory_id;
        const b_id = b_link ? b_link.region.trajectory_id : b.region.trajectory_id;

        return d3.ascending(a_id, b_id);
      });
    });

    // Position nodes in x
    const nodeWidth = 24;

    const xScale = d3.scaleLinear()
        .domain([0, nodes.length - 1])
        .range([0, innerWidth() - nodeWidth]);

    nodes.forEach((frameNodes, i, a) => {
      frameNodes.forEach(node => {
        const x = xScale(i);

        node.value = Math.max(d3.sum(node.targetLinks, link => link.value), 1);
        node.depth = i;
        node.height = a.length - 1 - i;
        node.x0 = x;
        node.x1 = x + nodeWidth;
      });
    });

    // Position nodes in y
    const padding = 4;
    const nodeHeight = d3.min(nodes, frameNodes => {
      const padTotal = (frameNodes.length - 1) * padding;
      return (innerHeight() - padTotal) / d3.sum(frameNodes, node => node.value);
    });

    nodes.forEach(frameNodes => {
      let y = 0;

      frameNodes.forEach(node => {
        node.y0 = y;
        node.y1 = y + node.value * nodeHeight;
        y = node.y1 + padding;
      });
    });

    nodes = d3.merge(nodes);

    nodes.forEach(node => {
      let startY = node.y0 + nodeHeight / 2;

      let y = startY;

      node.sourceLinks.forEach(link => {
        link.y0 = y;
        y += nodeHeight;
      });

      y = startY;

      node.targetLinks.forEach(link => {
        link.y1 = y;
        link.width = nodeHeight;
        y += nodeHeight;
      });
    });

    graph = {
      nodes: nodes,
      links: links
    };

    function id(frameIndex, regionId) {
      return "frame" + frameIndex + "_" + regionId;
    } 
  }

  function draw() {
    // Set width and height
    svg .attr("width", width)
        .attr("height", height);

    const {nodes, links} = graph;

    // Set color map as it is set in sketch. Should probably do this elsewhere and pass in   
    let trajectories = new Set();
    
    data.segmentationData.forEach(frame => {
      frame.regions.forEach(region => {
        trajectories.add(region.trajectory_id);
      });
    });

    trajectories = Array.from(trajectories).sort();

    const colorMap = d3.scaleOrdinal(d3ScaleChromatic.schemeDark2.slice(0, -1))
        .domain(trajectories);

    // Draw the visualization
    drawLinks();
    drawNodes();

    function drawLinks() {
      // Bind data for links
      let link = svg.select(".links").selectAll(".link")
          .data(links, d => d.source.id + "_" + d.target.id);

      // Link enter + update
      link.enter().append("path")
          .attr("class", "link")
          .style("fill", "none")
        .merge(link)
          .attr("d", d3Sankey.sankeyLinkHorizontal())
          .style("stroke", stroke)
          .style("stroke-width", strokeWidth);

      // Link exit
      link.exit().remove();

      function stroke(d) {
        return colorMap(d.source.region.trajectory_id);
      }

      function strokeWidth(d) {
        return d.width / 2;
      }
    }

    function drawNodes() {
      const r = 3;

      // Bind nodes
      let node = svg.select(".nodes").selectAll(".node")
          .data(nodes, d => d.id);

      // Node enter + update
      node.enter().append("rect")
          .attr("class", "node")
          .attr("rx", r)
          .attr("ry", r)
          .style("stroke-width", 2)
          //.on("mouseover", d => console.log(d))
        .merge(node) 
          .attr("x", x)
          .attr("y", y)
          .attr("width", width)
          .attr("height", height)
          .style("fill", fill)
          .style("stroke", stroke);

      // Node exit
      node.exit().remove();

      function x(d) {
        return d.x0;
      }

      function y(d) {
        return d.y0;
      }

      function width(d) {
        return d.x1 - d.x0;
      }

      function height(d) {
        return d.y1 - d.y0;
      }

      function fill(d) {
        return colorMap(d.region.trajectory_id);
      }

      function stroke(d) {
        //return d.region.highlight ? "#000" : "#fff";
        return "#fff";
      }
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
