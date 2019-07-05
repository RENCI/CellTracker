import * as d3 from "d3";

export default function() {
      // Size
  let margin = { top: 10, left: 10, bottom: 10, right: 10 },
      width = 200,
      height = 200,
      innerWidth = function() { return width - margin.left - margin.right; },
      innerHeight = function() { return height - margin.top - margin.bottom; },

      // Data
      data,
      graph = {},

      // Settings
      currentFrame = 0,
      zoomPoint = null,
      zoom = 0,

      // Appearance
      nodeSize = 0,
      nodeStrokeWidth = 0,

      // Start with empty selection
      svg = d3.select(),

      // Event dispatcher
      dispatcher = d3.dispatch("highlightRegion", "selectRegion", "setFrame");

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
      g.append("g").attr("class", "frames");
      g.append("g").attr("class", "links");
      g.append("g").attr("class", "nodes");

      svg = svgEnter.merge(svg);

      draw();
    });
  }

  function processData() {
    // Mimic d3 Sankey, but enforce x-positions on nodes based on frame

    // Find trajectories with visible regions
    let visibleTrajectories = null;
    
    if (zoomPoint) {
      visibleTrajectories = new Set();

      const z = 1 / zoom / 2,
            bb = [zoomPoint[0] - z, zoomPoint[1] - z, 
                  zoomPoint[0] + z, zoomPoint[1] + z];

      data.segmentationData.forEach(frame => {
        frame.regions.forEach(region => {
          for (let i = 0; i < region.vertices.length; i++) {
            const v = region.vertices[i];

            if (v[0] >= bb[0] && v[0] <= bb[2] &&
                v[1] >= bb[1] && v[1] <= bb[3]) {
              visibleTrajectories.add(region.trajectory_id);
              return;
            }
          }
        });
      });
    }

    // Create nodes from regions
    let nodes = data.segmentationData.map((frame, i) => {
      const frameNodes = {};

      frame.regions.filter(region => {
        return visibleTrajectories ? visibleTrajectories.has(region.trajectory_id) : true;
      }).forEach(region => {
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

    nodes.forEach((frameNodes, i) => {
      if (i === 0) return;

      d3.values(frameNodes).forEach(target => {
        if (target.region.link_id) {
          const source = nodes[i - 1][target.region.link_id];

          if (!source) {            
//            console.log("Invalid link_id: " + target.region.link_id);
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

    // Set start ids for sorting
    nodes.forEach((frameNodes, i, a) => {
      d3.values(frameNodes).forEach(node => {
        if (i === 0) {
          node.start_id = node.region.trajectory_id;
        }
        else {
          let start = a[i - 1][node.region.link_id];
          node.start_id = start ? start.start_id : node.region.trajectory_id;
        }
      });
    });

    // Convert each node frame to arrays and sort
    nodes = nodes.map((d, i) => {
      return d3.values(d).sort((a, b) => {
        return a.start_id === b.start_id ? 
          d3.ascending(a.region.trajectory_id, b.region.trajectory_id) :
          d3.ascending(a.start_id, b.start_id);
      });
    });

    // Initialize some node data
    nodes.forEach((frameNodes, i, a) => {
      frameNodes.forEach(node => {
        node.value = Math.max(d3.sum(node.sourceLinks, link => link.value), 1);
        node.depth = i;
        node.height = a.length - 1 - i;
      });
    });

    // Compute node size
    nodeSize = innerWidth() / 80;
    nodeStrokeWidth = nodeSize / 6;

    const padding = 0.5;

    // Position nodes
    const xScale = d3.scaleLinear()
        .domain([0, nodes.length - 1])
        .range([0, innerWidth() - nodeSize]);

    nodes.forEach((frameNodes, i) => {
      const x = xScale(i);
      let y = 0;

      frameNodes.forEach(node => {
        node.x0 = x;
        node.x1 = x + nodeSize;
        node.y1 = y;
        node.y0 = y - node.value * nodeSize;

        y = node.y0 - nodeSize * padding;
      });
    });

    // Flatten node array
    nodes = d3.merge(nodes);

    // Update height based on node size
    height = -d3.min(nodes, d => d.y0) + margin.top + margin.bottom;

    // Update y position
    nodes.forEach(node => {
      node.y0 += innerHeight();
      node.y1 += innerHeight();
    });

    // Position links
    nodes.forEach(node => {
      const x = (node.x0 + node.x1) / 2,
            startY = node.y0 + nodeSize / 2;

      let y = startY;

      node.sourceLinks.sort((a, b) => {
        return d3.ascending(a.target.y0, b.target.y0);
      });

      node.sourceLinks.forEach(link => {
        link.point0 = {
          x: x,
          y: y
        };

        link.width = nodeSize;

        y += nodeSize;
      });

      y = node.y0 + (node.y1 - node.y0) / 2;

      node.targetLinks.forEach(link => {
        link.point1 = {
          x: x,
          y: y
        };        

        y += nodeSize;
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

    const colorMap = d3.scaleOrdinal(d3.schemeDark2.slice(0, -1))
        .domain(trajectories);

    // Draw the visualization
    drawLinks();
    drawNodes();
    drawFrames();

    function drawLinks() {
      let linkShape = d3.linkHorizontal()
          .source(d => d.point0)
          .target(d => d.point1)
          .x(d => d.x)
          .y(d => d.y);

      // Bind data for links
      let link = svg.select(".links").selectAll(".link")
          .data(links, d => d.source.id + "_" + d.target.id);

      // Link enter + update
      link.enter().append("path")
          .attr("class", "link")
          .style("fill", "none")          
          .on("mouseover", mousemove)
          .on("mousemove", mousemove)
          .on("mouseout", function(d) {
            dispatcher.call("highlightRegion", this, null, null);
          })
        .merge(link)
          .attr("d", linkShape)
          .style("stroke", stroke)
          .style("stroke-width", linkWidth);

      // Link exit
      link.exit().remove();

      function stroke(d) {
        return colorMap(d.target.region.trajectory_id);
      }

      function linkWidth(d) {
        return d.width * 0.8;
      }

      function mousemove(d) {
        const x = d3.mouse(this)[0],
              s = x - d.point0.x,
              t = d.point1.x - x;

        if (s < t) dispatcher.call("highlightRegion", this, d.source.frameIndex, d.source.region);
        else dispatcher.call("highlightRegion", this, d.target.frameIndex, d.target.region);
      }
    }

    function drawNodes() {
      // Bind nodes
      let node = svg.select(".nodes").selectAll(".node")
          .data(nodes, d => d.id);

      // Node enter + update
      node.enter().append("rect")
          .attr("class", "node")
          .on("mouseover", function(d) {
            dispatcher.call("highlightRegion", this, d.frameIndex, d.region);
          })
          .on("mouseout", function(d) {
            dispatcher.call("highlightRegion", this, null, null);
          })
          .on("click", function(d) {
            dispatcher.call("selectRegion", this, d.frameIndex, d.region);
          })
        .merge(node)
          .attr("rx", nodeSize / 2)
          .attr("ry", nodeSize / 2)
          .attr("x", x)
          .attr("y", y)
          .attr("width", width)
          .attr("height", height)
          .style("fill", fill)
          .style("stroke", stroke)
          .style("stroke-width", nodeStrokeWidth);

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
        return "#fff";
      }

      function stroke(d) {;
        return d.region.highlight ? "#333" : colorMap(d.region.trajectory_id);
      }
    }

    function drawFrames() {
      const frameSize = nodeSize * 0.5;
      const diff = (frameSize - nodeSize) / 2;

      const frames = data.segmentationData;

      const xScale = d3.scaleLinear()
          .domain([0, frames.length - 1])
          .range([-diff, innerWidth() - nodeSize - diff]);

      const backWidth = xScale(1) - xScale(0);

      const backXScale = d3.scaleLinear()
          .domain([0, frames.length - 1])
          .range([nodeSize / 2 - backWidth / 2, innerWidth() - nodeSize / 2 - backWidth / 2]);

      // Bind frames
      let frame = svg.select(".frames").selectAll(".frame")
          .data(frames);

      // Frame enter
      let frameEnter = frame.enter().append("g")
          .attr("class", "frame")
          .on("mouseover", function(d, i) {
            dispatcher.call("setFrame", this, i);
          });

      frameEnter.append("rect")
          .attr("class", "background")
          .style("fill", "none")
          .style("stroke", "none")
          .style("pointer-events", "all");

      frameEnter.append("rect")
          .attr("class", "foreground")
          .style("stroke", "none");

      // Frame enter + update
      let frameUpdate = frameEnter.merge(frame);

      frameUpdate.select(".background")
          .attr("x", backX)
          .attr("y", 0)
          .attr("width", backWidth)
          .attr("height", innerHeight())

      frameUpdate.select(".foreground")
          .attr("rx", frameSize / 2)
          .attr("ry", frameSize / 2)
          .attr("x", x)
          .attr("y", -diff)
          .attr("width", frameSize)
          .attr("height", innerHeight() + diff)
          .style("fill", fill);

      // Frame exit
      frame.exit().remove();

      function x(d, i) {
        return xScale(i);
      }

      function fill(d, i) {
        return i === currentFrame ? "#aaa" : "#eee";
      }

      function backX(d, i) {
        return backXScale(i);
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

  trajectoryGraph.currentFrame = function(_) {
    if (!arguments.length) return currentFrame;
    currentFrame = _;
    return trajectoryGraph;
  };

  trajectoryGraph.zoomPoint = function(_) {
    if (!arguments.length) return zoomPoint;
    zoomPoint = _;
    return trajectoryGraph;
  };

  trajectoryGraph.zoom = function(_) {
    if (!arguments.length) return zoom;
    zoom = _;
    return trajectoryGraph;
  };

  // For registering event callbacks
  trajectoryGraph.on = function() {
    const value = dispatcher.on.apply(dispatcher, arguments);
    return value === dispatcher ? trajectoryGraph : value;
  };

  return trajectoryGraph;
}
