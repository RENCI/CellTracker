var numImages = 100;
var expId = "16101015300";

var images = [],
    frame = 0,
    maxFrame = 0;

var play = false
    direction = "forward";

var trace = false,
    positions = [];

function preload() {
  for (var i = 1; i <= numImages; i++) {
    images.push(loadImage("/display-image/" + expId + "/" + i));
  }

  maxFrame = images.length - 1;
}

function setup() {
  // Get parent div
  var div = select("#sketchDiv"),
      w = innerWidth(div.elt);

  // Size canvas to image aspect ratio
  var im = images[0],
      aspect = im.width / im.height;

  var canvas = createCanvas(w, w / aspect);
  canvas.parent(div);
  frameRate(2);
  pause();

  // Resize images
  images.forEach(function(im) {
    im.resize(width, height);
  });

  // Draw initial frame
  redraw();
}

function windowResized() {
  // Get parent div
  var div = select("#sketchDiv"),
      w = innerWidth(div.elt);

  // Size canvas to image aspect ratio
  var im = images[0],
      aspect = im.width / im.height;

  resizeCanvas(w, w / aspect);

  redraw();
}

function draw() {
  // Get image
  var im = images[frame];

  if (trace) {
    // Get normalized mouse position at end of last frame
    var x = mouseX / (width - 1),
        y = mouseY / (height - 1);

    positions.push([
      Math.max(0, Math.min(x, 1)),
      Math.max(0, Math.min(y, 1))
    ]);
  }

  image(im, 0, 0);

  // Draw path
  strokeWeight(4)
  for (var i = 1; i < positions.length; i++) {
    var p0 = positions[i - 1],
        p1 = positions[i];

    stroke(127, 127, 127, i / (positions.length - 1) * 255);

    line(p0[0] * width, p0[1] * height, p1[0] * width, p1[1] * height);
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

function mouseClicked() {
  trace = !trace;

  cursor(trace ? CROSS : ARROW);

  if (trace) positions = [];

  redraw();
}

function keyPressed() {
  switch (keyCode) {
    case 32:
      // Space bar
      togglePlay();
      break;

    case LEFT_ARROW:
      frameForward();
      break;

    case RIGHT_ARROW:
      frameBack();
      break;
  }
}

function play() {
  play = true;
  loop();
}

function pause() {
  play = false;
  noLoop();
}

function togglePlay() {
  play = !play;

  if (play) loop();
  else noLoop();
}

function frameForward() {
  frame = Math.min(frame + 1, maxFrame);
  pause();
  redraw();
}

function frameBack() {
  frame = Math.max(frame - 1, 0);
  pause();
  redraw();
}

function innerWidth(element) {
  var cs = getComputedStyle(element);

  var padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight),
      border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);

  return element.offsetWidth - padding - border;
}
