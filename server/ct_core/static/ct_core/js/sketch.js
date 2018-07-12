var numImages = 100;
var expId = "16101015300";

var images = [],
    imageIndex = 0;

var play = true;

var positions = [];

function preload() {
  for (var i = 1; i <= numImages; i++) {
    images.push(loadImage("/display-image/" + expId + "/" + i));
  }
}

function setup() {
  // Size canvas to image aspect ratio
  var im = images[0],
      aspect = im.width / im.height;

  createCanvas(windowWidth, windowWidth / aspect);
  frameRate(5);

  // Resize images
  images.forEach(function(im) {
    im.resize(width, height);
  });
}

function windowResized() {
  // Size canvas to image aspect ratio
  var im = images[0],
      aspect = im.width / im.height;

  resizeCanvas(windowWidth, windowWidth / aspect);
}

function draw() {
  if (!play) return;

  // Draw image
  var im = images[imageIndex];

  // Get normalized mouse position at end of last frame
  var x = mouseX / width,
      y = mouseY / height;

  positions.push([
    Math.max(0, Math.min(x, 1)),
    Math.max(0, Math.min(y, 1))
  ]);

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
  imageIndex++;
  if (imageIndex >= images.length) {
    imageIndex = 0;
    positions = [];
  }
}

function mouseClicked() {
  play = !play;
}
