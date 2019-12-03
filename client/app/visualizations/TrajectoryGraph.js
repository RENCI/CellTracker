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
    // Mimic d3 Sankey, but enforce y-positions on nodes based on frame

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

    if (visibleTrajectories.size === 0) {
      width = margin.left + margin.right;
      graph = {
        nodes: [],
        links: []
      };

      return;
    }

    // Create nodes from regions
    let nodes = [{
      // Root
      id: "root"
    }].concat(data.segmentationData.map((frame, i) => {
      // Dummy node per frame
      return {
        id: id(i, "dummy"),
        parentId: i === 0 ? "root" : id(i - 1, "dummy")
      };
    })).concat(d3.merge(data.segmentationData.map((frame, i) => {  
      // Nodes for visible trajectories    
      return frame.regions.filter(region => {
        return visibleTrajectories ? visibleTrajectories.has(region.trajectory_id) : true;
      }).map(region => {
        return {
          id: id(i, region.id),
          parentId: i === 0 ? "root" : 
              region.link_id ? id(i - 1, region.link_id) :
              id(i - 1, "dummy"),
          region: region
        };
      });
    })));

    const root = d3.stratify()(nodes);

    // Process tree data
    root.each(node => {
      if (node.data.region) {
        // For easier access
        node.region = node.data.region;

        // Value based on number of children
        node.value = node.children ? node.children.length : 1;
      }
    });

    // Compute node size
    fullHeight = height;
    nodeSize = innerHeight() / 80;
    nodeStrokeWidth = nodeSize / 6;

    // Minimum spacing in y
    const numFrames = data.segmentationData.length;
    const minYSpacing = nodeSize * 2;
    fullHeight = Math.max(numFrames * minYSpacing, height);

    // X scaling
    const padScale = 0.5;
    const tree = d3.tree()
        .nodeSize([nodeSize + nodeSize * padScale, fullHeight / numFrames])
        .separation(node => node.value) 
        (root);    

    nodes = tree.descendants().filter(node => {
      return node.data.region;
    });


// Update width based on node size
// XXX: NEED TO UPDATE THIS
width = -d3.min(nodes, node => node.x0) + nodeSize + margin.left + margin.right;

// Update x position
const xShift = innerWidth() - nodeSize / 2;
nodes.forEach(node => {
  node.x0 += xShift;
  node.x1 += xShift;
});




    nodes.forEach(node => {
      node.region = node.data.region;

      const w = (node.children ? node.children.length : 1) * nodeSize;

      node.x0 = node.x - w / 2;
      node.x1 = node.x + w / 2;

      node.y0 = node.y - nodeSize / 2;
      node.y1 = node.y + nodeSize / 2;
    });

    const links = tree.links().filter(link => {
      return link.source.region && link.target.region;
    });

    links.forEach(link => {
      link.point0 = { x: link.source.x, y: link.source.y };
      link.point1 = { x: link.target.x, y: link.target.y };
      link.width = nodeSize;
    });


    console.log(nodes);

    
    graph = {
      nodes: nodes,
      links: links
    };




/*    

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
        node.width = a.length - 1 - i;
      });
    });

    // Compute node size
    fullHeight = height;
    nodeSize = innerHeight() / 80;
    nodeStrokeWidth = nodeSize / 6;

    // Minimum spacing in y
    const minYSpacing = nodeSize * 2;
    fullHeight = Math.max(nodes.length * minYSpacing, height);

    // Total width
    const padScale = 0.5;
    const totalWidth = d3.max(nodes, frameNodes => {
      const size = d3.sum(frameNodes, node => node.value) * nodeSize;
      const pad = (frameNodes.length - 1) * nodeSize * padScale;
      return size + pad;
    });

    // Position nodes
    const yScale = d3.scaleLinear()
        .domain([0, nodes.length - 1])
        .range([0, innerHeight() - nodeSize]);

    nodes.forEach((frameNodes, i) => {
      const totalSize = d3.sum(frameNodes, node => node.value) * nodeSize;
      const padding = (totalWidth - totalSize) / (frameNodes.length - 1);

      let x = 0;
      const y = yScale(i);

      frameNodes.forEach((node, j) => {
        node.x1 = x;
        node.x0 = x - node.value * nodeSize;
        node.y0 = y;
        node.y1 = y + nodeSize;

        x = node.x0 - padding;
      });
    });    

    // Flatten node array
    nodes = d3.merge(nodes);

    // Update width based on node size
    width = -d3.min(nodes, node => node.x0) + nodeSize + margin.left + margin.right;

    // Update x position
    const xShift = innerWidth() - nodeSize / 2;
    nodes.forEach(node => {
      node.x0 += xShift;
      node.x1 += xShift;
    });

    // Position links
    nodes.forEach(node => {
      const y = (node.y0 + node.y1) / 2,
            startX = node.x0 + nodeSize / 2;

      let x = startX;

      node.sourceLinks.sort((a, b) => {
        return d3.ascending(a.target.x0, b.target.x0);
      });

      node.sourceLinks.forEach(link => {
        link.point0 = {
          x: x,
          y: y
        };

        link.width = nodeSize;

        x += nodeSize;
      });

      x = node.x0 + (node.x1 - node.x0) / 2;

      node.targetLinks.forEach(link => {
        link.point1 = {
          x: x,
          y: y
        };        

        x += nodeSize;
      });
    });    

    graph = {
      nodes: nodes,
      links: links
    };
*/
    function id(frameIndex, regionId) {
      return "frame" + frameIndex + "_" + regionId;
    }
  }

  function draw() {
    // Set width and height
    svg .attr("width", width)
        .attr("height", height);

    // Translate to keep current frame in view
    const frameScale = d3.scaleLinear()
        .domain([0, data.segmentationData.length - 1])
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
        return colorMap(d.target.region.trajectory_id);
      }

      function linkWidth(d) {
        return d.width * 0.8;
      }

      function mousemove(d) {
        const y = d3.mouse(this)[1],
              s = y - d.point0.y,
              t = d.point1.y - y;

        if (s < t) dispatcher.call("highlightRegion", this, d.source.frameIndex, d.source.region);
        else dispatcher.call("highlightRegion", this, d.target.frameIndex, d.target.region);
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
            dispatcher.call("highlightRegion", this, null, d.region);
          })
          .on("mouseout", function(d) {
            dispatcher.call("highlightRegion", this, null, null);
          })          
          .on("click", function(d) {
            dispatcher.call("selectRegion", this, d.frameIndex, d.region);
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
        return d.region.highlight ? nodeSize / 2 + offset : nodeSize / 2;
      }

      function x(d) {
        return d.region.highlight ? d.x0 - offset : d.x0;
      }

      function y(d) {
        return d.region.highlight ? d.y0 - offset : d.y0;
      }

      function width(d) {
        return d.region.highlight ? (d.x1 - d.x0) + offset * 2 : d.x1 - d.x0;
      }

      function height(d) {
        return d.region.highlight ? (d.y1 - d.y0) + offset * 2 : d.y1 - d.y0;
      }

      function fill(d) {
        //return "#fff";
        return d.region.highlight || d.region.isLinkRegion ? colorMap(d.region.trajectory_id) : "#fff";
      }

      function stroke(d) {;
        return d.region.highlight || d.region.isLinkRegion ? "#333" : colorMap(d.region.trajectory_id);
        //return d.region.highlight ? "#fff" : colorMap(d.region.trajectory_id);
        //return colorMap(d.region.trajectory_id);
      }

      function strokeWidth(d) {
        return d.region.highlight || d.region.isLinkRegion ? nodeStrokeWidth * 2 : nodeStrokeWidth;
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

  // For registering event callbacks
  trajectoryGraph.on = function() {
    const value = dispatcher.on.apply(dispatcher, arguments);
    return value === dispatcher ? trajectoryGraph : value;
  };

  return trajectoryGraph;
}
