var ServerActionCreators = require("../actions/ServerActionCreators");

// Create p5 instance for loading images
var loadingSketch = new p5(function (sketch) {});

// Get a cookie for cross site request forgery (CSRF) protection
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function csrfSafeMethod(method) {
    // These HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

function setupAjax() {
  $.ajaxSetup({
    beforeSend: function(xhr, settings) {
      if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
      }
    }
  });
}

function getExperimentList() {
  setupAjax();

  $.ajax({
    type: "POST",
    url: "/get_experiment_list/",
    success: function (data) {
      // Create an action
      ServerActionCreators.receiveExperimentList(data);
    },
    error: function (xhr, textStatus, errorThrown) {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}

function getExperimentInfo(id) {
  setupAjax();

  var imageType = "jpg";

  function imageCallback(i) {
    return function(data) {
      ServerActionCreators.receiveFrame(i, data);
    }
  }

  function segmentationCallback(i) {
    return function(data) {
      ServerActionCreators.receiveSegmentationFrame(i, data);
    }
  }

  $.ajax({
    type: "POST",
    url: "/get_experiment_info/" + id,
    success: function (data) {
      data.hasSegmentation = data.hasSegmentation === "true";

      // Get frames from random location
      var n = Math.min(data.frames, 5);
      var start = Math.round(Math.random() * (data.frames - n));
      data.frames = n;
      data.start = start;
      data.stop = start + n -1;

      // Create an action
      ServerActionCreators.receiveExperiment(data);

      for (var i = 0; i < n; i++) {
        var frame = start + i;

        // Load image frame
        loadingSketch.loadImage("/display-image/" + id + "/" + imageType + "/" + frame, imageCallback(i));

        // Load segmentation frame
        if (data.hasSegmentation) {
          $.ajax({
            type: "POST",
            url: "/get_frame_seg_data/" + id + "/" + frame,
            success: segmentationCallback(i),
            error: function (xhr, textStatus, errorThrown) {
              console.log(textStatus + ": " + errorThrown);
            }
          });
        }
      }
    },
    error: function (xhr, textStatus, errorThrown) {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}

function saveSegmentationData(id, data) {
  setupAjax();

  // Send each edited frame
  data.filter(function (frame) {
    return frame.edited;
  }).forEach(function (frame) {
    console.log("Saving frame " + frame.frame);

    let regions = JSON.stringify(frame.regions.map(function(region) {
      return {
        id: region.id,
        vertices: region.vertices
      };
    }));

    $.ajax({
      type: "POST",
      url: "/save_segmentation_data/" + id + "/" + frame.frame,
      data: regions,
      success: function (data) {
        // Segmentation saved action?
      },
      error: function (xhr, textStatus, errorThrown) {
        console.log(textStatus + ": " + errorThrown);
      }
    });
  });
}

function saveTraces(id, traces) {
  setupAjax();

  // Only keep fields we need to send
  var data = {
    traces: JSON.stringify(traces.map(function (trace) {
      return {
        name: trace.name,
        points: trace.points
      };
    }))
  };

  $.ajax({
    type: "POST",
    url: "/save_tracking_data/" + id,
    data: data,
    success: function (data) {
      // Tracking saved action?
    },
    error: function (xhr, textStatus, errorThrown) {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}

module.exports = {
  getExperimentList: getExperimentList,
  getExperimentInfo: getExperimentInfo,
  saveSegmentationData: saveSegmentationData,
  saveTraces: saveTraces
};
