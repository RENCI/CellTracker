import * as ServerActionCreators from "../actions/ServerActionCreators";

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

export const getExperimentList = () => {
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

export const getExperimentInfo = experiment => {
  setupAjax();

  $.ajax({
    type: "POST",
    url: "/get_experiment_info/" + experiment.id,
    success: function (data) {
      data.has_segmentation = data.has_segmentation === "true";

      // Number of frames
      const n = Math.min(data.frames, 10);

      // Center around start_frame
      let start = Math.max(data.start_frame - Math.ceil(n / 2) + 1, 1);
      const stop = Math.min(start + n - 1, data.frames);
      start = stop - n + 1;

      data.totalFrames = data.frames;
      data.frames = n;
      data.start = start;
      data.stop = stop;

      // Create an action
      ServerActionCreators.receiveExperiment(data);

      getFrames(data);
    },
    error: function (xhr, textStatus, errorThrown) {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}

export const getFrames = experiment => {
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

  for (var i = 0; i < experiment.frames; i++) {
    var frame = experiment.start + i;

    // Load image frame
    loadingSketch.loadImage("/display-image/" + experiment.id + "/" + imageType + "/" + frame, imageCallback(i));

    // Load segmentation frame
    if (experiment.has_segmentation) {
      $.ajax({
        type: "POST",
        url: "/get_frame_seg_data/" + experiment.id + "/" + frame,
        success: segmentationCallback(i),
        error: function (xhr, textStatus, errorThrown) {
          console.log(textStatus + ": " + errorThrown);
        }
      });
    }
  }
}

function pollUpdatedTracking(taskId) {
  var timeOutStatusId = -1;

  $.ajax({
    dataType: "json",
    cache: false,
    timeout: 60000,
    type: "POST",
    url: '/check_task_status/',
    data: {
      task_id: taskId
    },
    success: function(data) {
      if (data.error) {
        if (timeOutStatusId > -1) {
          clearTimeout(timeOutStatusId);
        }
        console.log(data.error);
      }
      else if (data.result) {
        if (timeOutStatusId > -1) {
          clearTimeout(timeOutStatusId);
        }

        ServerActionCreators.updateTracking(data.result);
      }
      else {
        timeOutStatusId = setTimeout(function () {
          pollUpdatedTracking(taskId);
        }, 1000);
      }
    },
    error: function (xhr, textStatus, errorThrown) {
      if (timeOutStatusId > -1) {
        clearTimeout(timeOutStatusId);
      }

      console.log(textStatus + ": " + errorThrown);
    }
  });
}

export const saveSegmentationData = (id, data) => {
  setupAjax();

  // Send each edited frame
  data.filter(frame => frame.edited).forEach(frame => {
    console.log("Saving frame " + frame.frame);

    const regions = JSON.stringify(frame.regions.map(region => {
      const sendRegion = {
        id: region.id,
        vertices: region.vertices
      };

      if (region.unsavedEdit) sendRegion.edited = true;

      return sendRegion;
    }));

    const numEdited = frame.regions.reduce((p, c) => c.edited || c.unsavedEdit ? p + 1 : p, 0);

    $.ajax({
      type: "POST",
      url: "/save_segmentation_data/" + id + "/" + frame.frame,
      data: {
        regions: regions,
        num_edited: numEdited
      },
      success: function (data) {
        if (data.task_id) {
          pollUpdatedTracking(data.task_id);
        }
      },
      error: function (xhr, textStatus, errorThrown) {
        console.log(textStatus + ": " + errorThrown);
      }
    });
  });
}
