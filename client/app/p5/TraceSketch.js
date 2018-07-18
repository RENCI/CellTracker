var d3Scale = require("d3-scale");
var d3ScaleChromatic = require("d3-scale-chromatic");

module.exports = function (sketch) {
  var experimentId = null;

  var images = [],
      colorImages = [],
      frame = 0,
      maxFrame = 0;

  // Use d3 color scale, but generate a lookup table from that for speed
  var colorScale = d3Scale.scaleSequential(d3ScaleChromatic.interpolateInferno),
      lut = [];

  for (var i = 0; i < 256; i++) {
    var c = sketch.color(colorScale(i / 255));

    lut[i] = [
      sketch.red(c),
      sketch.green(c),
      sketch.blue(c)
    ];
  }

  var play = false,
      direction = "forward";

  var trace = false,
      positions = [[]];

  sketch.updateProps = function(props) {
    // Check for new experiment
    if (experimentId !== props.experiment.id) {
      experimentId = props.experiment.id;
      var numFrames = props.experiment.frames;

numFrames = 10;

      // Clear current data and pause
      images = [];
      pause();

      // Load images
      var tempImages = [];
      for (var i = 1; i <= numFrames; i++) {
        sketch.loadImage("/display-image/" + experimentId + "/" + i, function (im) {
          tempImages.push(im);

          console.log("Loaded " + tempImages.length);

          if (tempImages.length === numFrames) {
            images = tempImages.slice();
            maxFrame = images.length - 1;

            resizeImages();
          }
        });
      }
    }
  }

  sketch.setup = function() {
    // Create canvas with default size
    sketch.createCanvas(100, 100);
    sketch.frameRate(2);
    pause();
  }

  sketch.windowResized = function() {
    resizeImages();
  }

  sketch.draw = function() {
    if (images.length === 0) return;

    // Get image
    var im = colorImages[frame];

    if (trace) {
      // Get normalized mouse position at end of last frame
      var x = sketch.map(sketch.mouseX, 0, sketch.width - 1, 0, 1, true),
          y = sketch.map(sketch.mouseY, 0, sketch.height - 1, 0, 1, true);

      positions.push([x, y, frame]);
    }

    // Draw the image
    sketch.image(im, 0, 0);

    // Draw path
    sketch.strokeWeight(4)
    for (var i = 1; i < positions.length; i++) {
      var p0 = positions[i - 1],
          p1 = positions[i],
          alpha = sketch.map(i, 1, positions.length - 1, 100, 255);

      sketch.stroke(127, 127, 127, alpha);

      sketch.line(
        p0[0] * (sketch.width - 1), p0[1] * (sketch.height - 1),
        p1[0] * (sketch.width - 1), p1[1] * (sketch.height - 1)
      );
    }

    // Get next image
    if (play) {
      frame++;
      if (frame > maxFrame) {
        frame = maxFrame;
        pause();
      }
    }
  }

  // XXX: Need to limit to events on the canvas
  sketch.mouseClicked = function() {
    trace = !trace;

    sketch.cursor(trace ? sketch.CROSS : sketch.ARROW);

    if (trace) positions = [];
  }

  // XXX: Need to limit to events on the canvas
  sketch.keyPressed = function() {
    switch (sketch.keyCode) {
      case 32:
        // Space bar
        togglePlay();
        break;

      case sketch.LEFT_ARROW:
        frameBack();
        break;

      case sketch.RIGHT_ARROW:
        frameForward();
        break;
    }
  }

  function resizeImages() {
    // Size canvas to image aspect ratio
    var im = images[0],
        aspect = im.width / im.height;

    // Get parent div
    // XXX: Pass through props?
    var div = sketch.select("#sketchDiv"),
        w = innerWidth(div.elt),
        h = w / aspect;

    // Resize images
    images.forEach(function(im) {
      im.resize(w, h);
    });

    colorImages = images.map(function(im) {
      var colorIm = sketch.createImage(im.width, im.height);

      im.loadPixels();
      colorIm.loadPixels();
      
      for (var x = 0; x < im.width; x++) {
        for (var y = 0; y < im.height; y++ ) {
          var i = (x + y * im.width) * 4,
              c = lut[im.pixels[i]];

          colorIm.pixels[i] = c[0];
          colorIm.pixels[i + 1] = c[1];
          colorIm.pixels[i + 2] = c[2];
          colorIm.pixels[i + 3] = 255;
        }
      }

      colorIm.updatePixels();

      return colorIm;
    });

    sketch.resizeCanvas(w, h);
  }

  function play() {
    play = true;
    sketch.loop();
  }

  function pause() {
    play = false;
    sketch.noLoop();
  }

  function togglePlay() {
    play = !play;

    if (play) sketch.loop();
    else sketch.noLoop();
  }

  function frameForward() {
    frame = Math.min(frame + 1, maxFrame);
    pause();
    sketch.redraw();
  }

  function frameBack() {
    frame = Math.max(frame - 1, 0);
    pause();
    sketch.redraw();
  }

  function innerWidth(element) {
    var cs = getComputedStyle(element);

    var padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
        border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);

    return element.offsetWidth - padding - border;
  }
}
