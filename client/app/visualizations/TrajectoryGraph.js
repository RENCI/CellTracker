import * as d3 from "d3";
import { regionColors } from "../utils/ColorUtils";

export default function() {
      // Size
  let margin = { top: 10, left: 10, bottom: 10, right: 10 },
      width = 200,
      height = 200,
      fullHeight = 200,
      innerWidth = function() { return width - margin.left - margin.right; },
      innerHeight = function() { return fullHeight - margin.top - margin.bottom; },

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
      graph = data.trajectoryGraph;

      processData();

      // Create skeletal chart
      svg = d3.select(this).selectAll("svg")
          .data([data]);

      const svgEnter = svg.enter().append("svg")
          .attr("class", "trajectoryGraph");

      const g = svgEnter.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .append("g")
          .attr("class", "mainGroup");

      // Groups for layout
      g.append("g").attr("class", "frames");
      g.append("g").attr("class", "links");
      g.append("g").attr("class", "nodes");

      svg = svgEnter.merge(svg);

      draw();
    });
  }

  function processData() {
    const {nodes, links} = graph;

    if (nodes.length === 0) {
      width = margin.left + margin.right; 
      return;
    }

    // Compute node size
    fullHeight = height;
    nodeSize = innerHeight() / 80;
    nodeStrokeWidth = nodeSize / 6;

    // Minimum spacing in y
    const numFrames = data.segmentationData.length;
    const minYSpacing = nodeSize * 2;
    fullHeight = Math.max(numFrames * minYSpacing, height);

    // Position nodes
    const yScale = d3.scaleLinear()
        .domain([0, numFrames - 1])
        .range([0, innerHeight() - nodeSize]);

    nodes.forEach(node => {
      const x = node.x * nodeSize;

      const w = node.value * nodeSize / 2;
      node.x0 = x - w;
      node.x1 = x + w;

      node.y0 = yScale(node.data.frameIndex);
      node.y = node.y0 + nodeSize / 2;
      node.y1 = node.y0 + nodeSize;
    });

    // Update width
    const xMin = d3.min(nodes, node => node.x0);
    const xMax = d3.max(nodes, node => node.x1);
    width = xMax - xMin + nodeSize + margin.left + margin.right;

    // Update x position
    const xShift = -xMin + nodeSize / 2;

    nodes.forEach(node => {
      node.x0 += xShift;
      node.x1 += xShift;
    });
    
    // Position links
    nodes.forEach(node => { 
      const y = node.y,
            startX = node.x0 + nodeSize / 2;

      let x = startX;

      const sourceLinks = links.filter(link => link.source === node);
      const targetLinks = links.filter(link => link.target === node);

      sourceLinks.sort((a, b) => {
        return d3.ascending(a.target.x0, b.target.x0);
      });

      sourceLinks.forEach(link => {
        link.point0 = {
          x: x,
          y: y
        };

        link.width = nodeSize;

        x += nodeSize;
      });

      x = node.x0 + (node.x1 - node.x0) / 2;

      targetLinks.forEach(link => {
        link.point1 = {
          x: x,
          y: y
        };        

        x += nodeSize;
      });
    });
  }

  function draw() {
    // Set width and height
    svg .attr("width", width)
        .attr("height", height);

    // Translate to keep current frame in view
    const frameScale = d3.scaleLinear()
        .domain([0, frames.length - 1])
        .range([0, innerHeight() - nodeSize]);

    let y = height / 2 - frameScale(currentFrame);

    // Clamp
    y = Math.max(height - fullHeight, Math.min(y, 0));

    svg.select(".mainGroup")
        .attr("transform", "translate(0," + y + ")");    

    // Get nodes and links
    const {nodes, links} = graph;

    // Set color map as it is set in sketch. Should probably do this elsewhere and pass in
    let trajectories = new Set();

    data.segmentationData.forEach(frame => {
      frame.regions.forEach(region => {
        trajectories.add(region.trajectory_id);
      });
    });

    trajectories = Array.from(trajectories).sort();

    const colorMap = d3.scaleOrdinal(regionColors)
        .domain(trajectories);

    // Draw the visualization
    drawLinks();
    drawNodes();
    drawFrames();

    function drawLinks() {
      let linkShape = d3.linkVertical()
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
/*                
          .on("mouseover", mousemove)
          .on("mousemove", mousemove)
          .on("mouseout", function(d) {
            dispatcher.call("highlightRegion", this, null, null);
          })
*/          
        .merge(link)
          .attr("d", linkShape)
          .style("stroke", stroke)
          .style("stroke-width", linkWidth);

      // Link exit
      link.exit().remove();

      function stroke(d) {
        return colorMap(d.target.data.region.trajectory_id);
      }

      function linkWidth(d) {
        return d.width * 0.8;
      }

      function mousemove(d) {
        const y = d3.mouse(this)[1],
              s = y - d.point0.y,
              t = d.point1.y - y;

        if (s < t) dispatcher.call("highlightRegion", this, d.source.data.frameIndex, d.source.data.region);
        else dispatcher.call("highlightRegion", this, d.target.data.frameIndex, d.target.data.region);
      }
    }

    function drawNodes() {
      const offset = nodeSize * 0.25;

      // Bind nodes
      let node = svg.select(".nodes").selectAll(".node")
          .data(nodes, d => d.id);

      // Node enter + update
      node.enter().append("rect")
          .attr("class", "node")          
          .on("mouseover", function(d) {
            dispatcher.call("highlightRegion", this, null, d.data.region);
          })
          .on("mouseout", function(d) {
            dispatcher.call("highlightRegion", this, null, null);
          })          
          .on("click", function(d) {
            dispatcher.call("selectRegion", this, d.data.frameIndex, d.data.region);
          })
        .merge(node)
          .attr("rx", r)
          .attr("ry", r)
          .attr("x", x)
          .attr("y", y)
          .attr("width", width)
          .attr("height", height)
          .style("fill", fill)
          .style("stroke", stroke)
          .style("stroke-width", strokeWidth);

      // Node exit
      node.exit().remove();      

      function r(d) {
        return d.data.region.highlight ? nodeSize / 2 + offset : nodeSize / 2;
      }

      function x(d) {
        return d.data.region.highlight ? d.x0 - offset : d.x0;
      }

      function y(d) {
        return d.data.region.highlight ? d.y0 - offset : d.y0;
      }

      function width(d) {
        return d.data.region.highlight ? (d.x1 - d.x0) + offset * 2 : d.x1 - d.x0;
      }

      function height(d) {
        return d.data.region.highlight ? (d.y1 - d.y0) + offset * 2 : d.y1 - d.y0;
      }

      function fill(d) {
        //return "#fff";
        return d.data.region.highlight || d.data.region.isLinkRegion ? colorMap(d.data.region.trajectory_id) : "#fff";
      }

      function stroke(d) {;
        return d.data.region.highlight || d.data.region.isLinkRegion ? "#333" : colorMap(d.data.region.trajectory_id);
        //return d.data.region.highlight ? "#fff" : colorMap(d.data.region.trajectory_id);
        //return colorMap(d.data.region.trajectory_id);
      }

      function strokeWidth(d) {
        return d.data.region.highlight || d.data.region.isLinkRegion ? nodeStrokeWidth * 2 : nodeStrokeWidth;
        //return nodeStrokeWidth;
      }
    }

    function drawFrames() {
      const frameSize = nodeSize * 0.5;
      const diff = (frameSize - nodeSize) / 2;

      const frames = data.segmentationData;

      const yScale = d3.scaleLinear()
          .domain([0, frames.length - 1])
          .range([-diff, innerHeight() - nodeSize - diff]);

      const backHeight = yScale(1) - yScale(0);

      const backYScale = d3.scaleLinear()
          .domain([0, frames.length - 1])
          .range([nodeSize / 2 - backHeight / 2, innerHeight() - nodeSize / 2 - backHeight / 2]);

      // Bind frames
      let frame = svg.select(".frames").selectAll(".frame")
          .data(frames);

      // Frame enter
      let frameEnter = frame.enter().append("g")
          .attr("class", "frame");
/*          
          .on("mouseover", function(d, i) {
            dispatcher.call("setFrame", this, i);
          });
*/          

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
          .attr("x", 0)
          .attr("y", backY)
          .attr("width", innerWidth())
          .attr("height", backHeight);

      frameUpdate.select(".foreground")
          .attr("rx", frameSize / 2)
          .attr("ry", frameSize / 2)
          .attr("x", 0)
          .attr("y", y)
          .attr("width", innerWidth())
          .attr("height", frameSize)
          .style("fill", fill);

      // Frame exit
      frame.exit().remove();

      function y(d, i) {
        return yScale(i);
      }

      function fill(d, i) {
        return i === currentFrame ? "#007bff" : "#eee";
      }

      function backY(d, i) {
        return backYScale(i);
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

trajectoryGraph.update = function() {
  draw();
}

  // For registering event callbacks
  trajectoryGraph.on = function() {
    const value = dispatcher.on.apply(dispatcher, arguments);
    return value === dispatcher ? trajectoryGraph : value;
  };

  return trajectoryGraph;
}
