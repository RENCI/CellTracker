var trace = new p5(function (s) {
  var numImages = 100;
  var expId = "16101015300";

  var images = [],
      frame = 0,
      maxFrame = 0;

  var play = false
      direction = "forward";

  var trace = false,
      positions = [];

  s.preload = function() {
    for (var i = 1; i <= numImages; i++) {
      images.push(s.loadImage("/display-image/" + expId + "/" + i));
    }

    maxFrame = images.length - 1;
  }

  s.setup = function() {
    // Get parent div
    var div = s.select("#sketchDiv"),
        w = innerWidth(div.elt);

    // Size canvas to image aspect ratio
    var im = images[0],
        aspect = im.width / im.height;

    var canvas = s.createCanvas(w, w / aspect);
    s.frameRate(2);
    pause();

    // Resize images
    images.forEach(function(im) {
      im.resize(s.width, s.height);
    });

    // Draw initial frame
    s.redraw();
  }

  s.windowResized = function() {
    // Get parent div
    var div = s.select("#sketchDiv"),
        w = innerWidth(div.elt);

    // Size canvas to image aspect ratio
    var im = images[0],
        aspect = im.width / im.height;

    s.resizeCanvas(w, w / aspect);

    s.redraw();
  }

  s.draw = function() {
    // Get image
    var im = images[frame];

    if (trace) {
      // Get normalized mouse position at end of last frame
      var x = s.mouseX / (s.width - 1),
          y = s.mouseY / (s.height - 1);

      positions.push([
        Math.max(0, Math.min(x, 1)),
        Math.max(0, Math.min(y, 1))
      ]);
    }

    s.image(im, 0, 0);

    // Draw path
    s.strokeWeight(4)
    for (var i = 1; i < positions.length; i++) {
      var p0 = positions[i - 1],
          p1 = positions[i];

      s.stroke(127, 127, 127, i / (positions.length - 1) * 255);

      s.line(
        p0[0] * (s.width - 1), p0[1] * (s.height - 1),
        p1[0] * (s.width - 1), p1[1] * (s.height - 1)
      );
    }

    // Get next image
    if (play) {
      frame++;
      if (frame > maxFrame) {
        play = !play;
        frame = 0;
      }
    }
  }

  s.mouseClicked = function() {
    trace = !trace;

    s.cursor(trace ? s.CROSS : s.ARROW);

    if (trace) positions = [];

    s.redraw();
  }

  s.keyPressed = function() {
    switch (s.keyCode) {
      case 32:
        // Space bar
        togglePlay();
        break;

      case s.LEFT_ARROW:
        frameBack();
        break;

      case s.RIGHT_ARROW:
        frameForward();
        break;
    }
  }

  function play() {
    play = true;
    s.loop();
  }

  function pause() {
    play = false;
    s.noLoop();
  }

  function togglePlay() {
    play = !play;

    if (play) s.loop();
    else s.noLoop();
  }

  function frameForward() {
    frame = Math.min(frame + 1, maxFrame);
    pause();
    s.redraw();
  }

  function frameBack() {
    frame = Math.max(frame - 1, 0);
    pause();
    s.redraw();
  }

  function innerWidth(element) {
    var cs = getComputedStyle(element);

    var padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
        border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);

    return element.offsetWidth - padding - border;
  }
}, "sketchDiv");
