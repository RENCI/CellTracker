module.exports = function (sketch) {
  var numImages = 50;
  var expId = "16101015300";

  var images = [],
      colorImages = [],
      frame = 0,
      maxFrame = 0;

  var lut = [],
      s1 = 256 / 3;
  for (var i = 0; i < 256; i++) {
    // Black-body radiation color map
    /*
    var r = sketch.map(i / 3, 0, s1, 0, 255, true),
        g = sketch.map((i - s1) / 3, 0, s1, 0, 255, true),
        b = sketch.map((i - s1 * 2) / 3, 0, s1, 0, 255, true);
    */

    var r = i / 3,
        g = i * 2 / 3,
        b = sketch.constrain(i * 2, 0, 255);

    lut[i] = [r, g, b];
  }

  var play = false,
      direction = "forward";

  var trace = false,
      positions = [];

  sketch.preload = function() {
    for (var i = 1; i <= numImages; i++) {
      images.push(sketch.loadImage("/display-image/" + expId + "/" + i));
    }

    maxFrame = images.length - 1;
  }

  sketch.setup = function() {
    // Get parent div
    var div = sketch.select("#sketchDiv"),
        w = innerWidth(div.elt);

    // Size canvas to image aspect ratio
    var im = images[0],
        aspect = im.width / im.height;

    var canvas = sketch.createCanvas(w, w / aspect);
    sketch.frameRate(2);
    pause();

    // Resize images
    images.forEach(function(im) {
      im.resize(sketch.width, sketch.height);
    });

    colorImages = images.map(function(im) {
      var colorIm = sketch.createImage(im.width, im.height);

      im.loadPixels();
      colorIm.loadPixels();

      for (var x = 0; x < im.width; x++) {
        for (var y = 0; y < im.height; y++ ) {
          var i = (x + y * im.width) * 4;

          var v = im.pixels[i];

          var c = lut[v];

          colorIm.pixels[i] = c[0];
          colorIm.pixels[i + 1] = c[1];
          colorIm.pixels[i + 2] = c[2];
          colorIm.pixels[i + 3] = 255;
        }
      }

      colorIm.updatePixels();

      return colorIm;
    });

    // Draw initial frame
    sketch.redraw();
  }

  sketch.windowResized = function() {
    // Get parent div
    var div = sketch.select("#sketchDiv"),
        w = innerWidth(div.elt);

    // Size canvas to image aspect ratio
    var im = images[0],
        aspect = im.width / im.height;

    sketch.resizeCanvas(w, w / aspect);

    sketch.redraw();
  }

  sketch.draw = function() {
    // Get image
    var im = colorImages[frame];

    if (trace) {
      // Get normalized mouse position at end of last frame
      var x = sketch.mouseX / (sketch.width - 1),
          y = sketch.mouseY / (sketch.height - 1);

      positions.push([
        Math.max(0, Math.min(x, 1)),
        Math.max(0, Math.min(y, 1))
      ]);
    }

    // Draw the image
    sketch.image(im, 0, 0);

    // Draw path
    sketch.strokeWeight(4)
    for (var i = 1; i < positions.length; i++) {
      var p0 = positions[i - 1],
          p1 = positions[i];

      sketch.stroke(127, 127, 127, i / (positions.length - 1) * 255);

      sketch.line(
        p0[0] * (sketch.width - 1), p0[1] * (sketch.height - 1),
        p1[0] * (sketch.width - 1), p1[1] * (sketch.height - 1)
      );
    }

    // Get next image
    if (play) {
      frame++;
      if (frame > maxFrame) {
        pause();
        frame = 0;
      }
    }
  }

  sketch.mouseClicked = function() {
    trace = !trace;

    sketch.cursor(trace ? sketch.CROSS : sketch.ARROW);

    if (trace) positions = [];

    sketch.redraw();

    return false;
  }

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

    return false;
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
