var ServerActionCreators = require("../actions/ServerActionCreators");

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

      // Request first workspace
      // XXX: Should this go in receiveWorkspaceList?
      getExperiment(data[0].id);
    },
    error: function (xhr, textStatus, errorThrown) {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}

function getExperiment(id) {
  setupAjax();

  $.ajax({
    type: "POST",
    url: "/get_experiment_info/" + id,
    success: function (data) {
      // Create an action
      ServerActionCreators.receiveExperiment(data);
    },
    error: function (xhr, textStatus, errorThrown) {
      console.log(textStatus + ": " + errorThrown);
    }
  });
}

function saveTraces(id, traces) {
  setupAjax();

  // Only keep fields we need to send
  var data = traces.map(function (trace) {
    return {
      name: trace.name,
      points: trace.points
    };
  });

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
  getExperiment: getExperiment,
  saveTraces: saveTraces
};
