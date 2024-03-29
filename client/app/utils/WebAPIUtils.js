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

export function getUserInfo() {
  setupAjax();

  $.ajax({
    type: "POST",
    url: "/get_user_info/",
    success: data => {
      // Create an action
      ServerActionCreators.receiveUserInfo(data);

      getAllUserInfo();
    },
    error: (xhr, textStatus, errorThrown) => {
      console.log(textStatus + ": " + errorThrown);
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
    success: (data, textStatus, xhr) => {
      // Check if locked
      data.has_segmentation = data.has_segmentation === "true";

      // Create an action
      ServerActionCreators.receiveExperimentInfo(data);

      // Start loading frames
      getFrames(experiment);
    },
    error: (xhr, textStatus, errorThrown) => {
      // Check if locked
      if (xhr.status === 403) {
        ServerActionCreators.experimentLocked(xhr.responseJSON);
      }
      else {
        console.log(textStatus + ": " + errorThrown);
      }
    }
  });
}

export function getFrames(experiment) {
  setupAjax();

  const imageType = "jpg";

  const imageCallback = (i, url) => {
    // Code adapted from p5.loadImage
    return () => {
      const pImg = loadingSketch.createImage(1, 1);
      const img = new Image();

      img.onload = () => {
        pImg.width = pImg.canvas.width = img.width;
        pImg.height = pImg.canvas.height = img.height;

        // Draw the image into the backing canvas of the p5.Image
        pImg.drawingContext.drawImage(img, 0, 0);
        pImg.modified = true;        

        ServerActionCreators.receiveFrame(i, pImg);
      };

      img.onerror = e => {
        // XXX: Handle this more elegantly?
        console.log(e);
      };

      // Start loading the image
      img.src = url;
    }
  }

  const segmentationCallback = i => {
    return data => {
      ServerActionCreators.receiveSegmentationFrame(i, data);
    }
  }

  const errorCallback = (xhr, textStatus, errorThrown) => {
    // Check if locked
    if (xhr.status === 403) {
      ServerActionCreators.experimentLocked(xhr.responseJSON);
    }
    else {
      console.log(textStatus + ": " + errorThrown);
    }
  }
  
  for (let frame = experiment.start; frame <= experiment.stop; frame++) {
    if (!experiment.images.find(d => d.frame === frame)) {
      const imageURL = "/display-image/" + experiment.id + "/" + imageType + "/" + frame;

      // Load image
      $.ajax({
        type: "POST",
        url: imageURL,
        success: imageCallback(frame, imageURL),
        error: errorCallback
      });  
    }

    if (!experiment.segmentationData.find(d => d.frame === frame)) {
      // Load segmentation frame
      if (experiment.has_segmentation) {
        $.ajax({
          type: "POST",
          url: "/get_frame_seg_data/" + experiment.id + "/" + frame,
          success: segmentationCallback(frame),
          error: errorCallback
        });
      }
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

function getAllUserInfo() {
  setupAjax();

  $.ajax({
    type: "POST",
    url: "/get_all_user_info/",
    success: data => {
      ServerActionCreators.receiveAllUserInfo(data);
    },
    error: (xhr, textStatus, errorThrown) => {
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
        edited: region.edited || region.unsavedEdit,
        changed: region.changed || region.unsavedChanges,
        link_id: region.link_id,
        manual_link: region.manual_link
      };

      if (region.unsavedEdit) {
        sendRegion.new_edits = true;
      }

      if (region.unsavedChanges) {
        sendRegion.new_changes = region.unsavedChanges;
      }

      if (region.labels && region.labels.length > 0) {
        sendRegion.labels = region.labels;
      }

      if (region.done) {
        sendRegion.done = true;
      }

      return sendRegion;
    });

    const saveData = {
      regions: JSON.stringify(regions),
      num_edited: regions.reduce((p, c) => c.edited ? p + 1 : p, 0)
    }

    $.ajax({
      type: "POST",
      url: "/save_segmentation_data/" + id + "/" + frame.frame,
      data: saveData,
      success: data => {
        /*
        if (data.task_id) {
          pollUpdatedTracking(data.task_id);
        }
        */
        const totalScore = +data.total_score;

        if (!isNaN(totalScore)) {
          ServerActionCreators.receiveScore(totalScore, Date.now());
        }

        getAllUserInfo();
      },
      error: (xhr, textStatus, errorThrown) => {
        console.log(textStatus + ": " + errorThrown);
      }
    });
  });
}

export function saveUserSettings(settings) {
  setupAjax();

  $.ajax({
    type: "POST",
    url: "/set_user_setting/",
    data: { settings:  JSON.stringify(settings) },
    success: () => {
      // XXX: Do anything?
    },
    error: (xhr, textStatus, errorThrown) => {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}

/*
export function getRegionScore(id, frame, region) {
  setupAjax();

  const regionString = JSON.stringify(region);

  console.log("Sending region");

  $.ajax({
    type: "POST",
    url: "/get_score/" + id + "/" + frame,
    data: {
      region: regionString
    },
    success: data => {
      const score = +data.score;
      if (!isNaN(score)) {
        alert("Score: " + data.score);
      }
    },
    error: (xhr, textStatus, errorThrown) => {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}
*/
