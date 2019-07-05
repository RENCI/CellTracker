import * as ServerActionCreators from "../actions/ServerActionCreators";

// Create p5 instance for loading images
const loadingSketch = new p5(function (sketch) {});

// Get a cookie for cross site request forgery (CSRF) protection
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
      let cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
          let cookie = jQuery.trim(cookies[i]);
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

export function getExperimentList() {
  setupAjax();

  $.ajax({
    type: "POST",
    url: "/get_experiment_list/",
    success: data => {
      // Create an action
      ServerActionCreators.receiveExperimentList(data);
    },
    error: (xhr, textStatus, errorThrown) => {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}

export function getExperimentInfo(experiment) {
  setupAjax();

  $.ajax({
    type: "POST",
    url: "/get_experiment_info/" + experiment.id,
    success: data => {
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
    error: (xhr, textStatus, errorThrown) => {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}

export function getFrames(experiment) {
  setupAjax();

  const imageType = "jpg";

  const imageCallback = i => {
    return data => {
      ServerActionCreators.receiveFrame(i, data);
    }
  }

  const segmentationCallback = i => {
    return data => {
      ServerActionCreators.receiveSegmentationFrame(i, data);
    }
  }

  for (let i = 0; i < experiment.frames; i++) {
    const frame = experiment.start + i;

    // Load image frame
    loadingSketch.loadImage("/display-image/" + experiment.id + "/" + imageType + "/" + frame, imageCallback(i));

    // Load segmentation frame
    if (experiment.has_segmentation) {
      $.ajax({
        type: "POST",
        url: "/get_frame_seg_data/" + experiment.id + "/" + frame,
        success: segmentationCallback(i),
        error: (xhr, textStatus, errorThrown) => {
          console.log(textStatus + ": " + errorThrown);
        }
      });
    }
  }
}

function pollUpdatedTracking(taskId) {
  let timeOutStatusId = -1;

  $.ajax({
    dataType: "json",
    cache: false,
    timeout: 60000,
    type: "POST",
    url: '/check_task_status/',
    data: {
      task_id: taskId
    },
    success: data => {
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
        timeOutStatusId = setTimeout(() => {
          pollUpdatedTracking(taskId);
        }, 1000);
      }
    },
    error: (xhr, textStatus, errorThrown) => {
      if (timeOutStatusId > -1) {
        clearTimeout(timeOutStatusId);
      }

      console.log(textStatus + ": " + errorThrown);
    }
  });
}

export function saveSegmentationData(id, data) {
  setupAjax();

  // Send each edited frame
  data.filter(frame => frame.edited).forEach(frame => {
    console.log("Saving frame " + frame.frame);

    const regions = frame.regions.map(region => {
      const sendRegion = {
        id: region.id,
        vertices: region.vertices,
        edited: region.edited || region.unsavedEdit
      };

      return sendRegion;
    });

    const numEdited = regions.reduce((p, c) => c.edited ? p + 1 : p, 0);

    const regionsString = JSON.stringify(regions);

    $.ajax({
      type: "POST",
      url: "/save_segmentation_data/" + id + "/" + frame.frame,
      data: {
        regions: regionsString,
        num_edited: numEdited
      },
      success: data => {
        if (data.task_id) {
          pollUpdatedTracking(data.task_id);
        }
      },
      error: (xhr, textStatus, errorThrown) => {
        console.log(textStatus + ": " + errorThrown);
      }
    });
  });
}
