var d3Scale = require("d3-scale");
var d3ScaleChromatic = require("d3-scale-chromatic");

module.exports = function (sketch) {
  // PNG or JPG
  var imageType = "jpg";

  // Images
  var images = [],
      colorImages = [],
      lut = createLut(d3ScaleChromatic.interpolateInferno);

  sketch.setup = function() {
    // Create canvas with default size
    var canvas = sketch.createCanvas(100, 100);
    sketch.noLoop();
  }

  sketch.loadFrame = function(frame) {
    console.log(frame);
  }

  sketch.updateProps = function(props) {
    var experimentId = props.experiment.id;
    var numFrames = props.experiment.frames;
    var onUpdateLoading = props.onUpdateLoading;

    // Clear current data
    images = [];

    // Load images
    var tempImages = [];
    var loaded = 0;

    function makeLoader(n) {
      return function(im) {
        tempImages[n] = im;
        loaded++;

        if (loaded === numFrames) {
          onUpdateLoading(null);

          images = tempImages.slice();

//          resizeImages();
        }
        else {
          console.log(loaded + 1, numFrames);
          onUpdateLoading(loaded + 1, numFrames);
        }
      }
    }

    for (var i = 0; i < numFrames; i++) {
      sketch.loadImage("/display-image/" + experimentId + "/" + imageType + "/" + (i + 1), makeLoader(i));
    }
  }

  sketch.draw = function() {
  }

  function createLut(colors) {
    var colorScale = d3Scale.scaleSequential(colors),
        lut = [];

    for (var i = 0; i < 256; i++) {
      var c = sketch.color(colorScale(i / 255));

      lut[i] = [
        sketch.red(c),
        sketch.green(c),
        sketch.blue(c)
      ];
    }

    return lut;
  }

  function resizeImages() {
    if (images.length === 0) return;

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
/*
    var r = 20,
        r2 = r * r;

    contrastImages = images.map(function(im) {
      var contrastIm = [];

      // XXX: Move after im.resize?
      im.loadPixels();

      for (var x = 0; x < im.width; x++) {
        for (var y = 0; y < im.height; y++ ) {
          var min = 255,
              max = 0;

          for (var i = Math.max(0, x - r); i <= Math.min(x + r, im.width - 1); i++) {
            for (var j = Math.max(0, y - r); j <= Math.min(y + r, im.height - 1); j++) {
              var k = (i + j * im.width) * 4,
                  v = im.pixels[k],
                  dx = i - x,
                  dy = j - y,
                  d2 = dx * dx + dy * dy;

              if (d2 <= r2) {
                if (v < min) min = v;
                if (v > max) max = v;
              }
            }
          }

          contrastIm.push([min, max]);
        }
      }

      return contrastIm;
    });
*/

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
}
