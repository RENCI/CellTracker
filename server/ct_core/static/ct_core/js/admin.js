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
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

var images = [];
var numImages;
var frame = 0;
var numMaxLoadFrames = 10;
// Create p5 instance for loading images
var adminSketch = new p5(function (sk) {});

function request_exp_list_ajax() {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });
    $.ajax({
        type: "POST",
        url: '/get_experiment_list/',
        success: function (json_response) {
            exp_res = json_response;
            if (exp_res.length > 0) {
                var select = document.getElementById("exp_select_list");
                select.options[0] = new Option('-- Select --', 'null');
                if (select.options.length <= 1) {
                    $.each(exp_res, function(i, v) {
                       sel_idx =  select.options.length;
                       select.options[sel_idx] = new Option(v['name'], v['id']);
                    });
                }
                $('#exp_select_list').val('null');
            }
            return true;
        },
        error: function (xhr, errmsg, err) {
            console.log(xhr.status + ": " + xhr.responseText + ". Error message: " + errmsg);
            return false;
        }
    });
}

function request_exp_info_ajax(exp_id) {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });
    $.ajax({
        type: "POST",
        url: "/get_experiment_info/" + exp_id,
        success: function (json_response) {
            data = json_response;
            numImages = data.frames;
            info_msg = 'This experiment has ' + numImages + ' frames and has segmentation data.';
            $('frame-visualizer').show();
            if (data.has_segmentation == 'true') {
                user_lists = data.edit_users;
                if (user_lists.length > 0) {
                    $('#seg_info').html(info_msg);
                    $('#user_edit').show();
                    $('#user_list').empty();
                    var select = document.getElementById("user_list");
                    $.each(user_lists, function(i, v) {
                        sel_idx =  select.options.length;
                        select.options[sel_idx] = new Option(v['name'], v['username']);
                    });
                    $('#user_list').trigger('change');
                }
                else {
                    $('#seg_info').html(info_msg + ' However, there is not yet user edit data for this experiment.');
                    $('#user_edit').hide();
                }
            }
            else {
                $('#seg_info').html('This experiment has ' + numImages + ' frames and does not has segmentation data.');
                $('#user_edit').hide();
            }
            if(numImages <= numMaxLoadFrames)
                loadNumImages = numImages;
            else
                loadNumImages = numMaxLoadFrames;

            images.length = 0;
            for(var i=1; i <= loadNumImages; i++) {
                images.push(adminSketch.loadImage("/display-image/" + exp_id + "/jpg/" + i));
            }
            resize();
            return true;
        },
        error: function (xhr, errmsg, err) {
            console.log(xhr.status + ": " + xhr.responseText + ". Error message: " + errmsg);
            return false;
        }
    });
}

function setup() {
    var canvas = adminSketch.createCanvas(windowWidth, windowHeight);
    canvas.parent('frame-visualizer');
    adminSketch.frameRate(5);
    adminSketch.noLoop();
}

function resize() {
    if (images.length === 0) return;

    // Size canvas to image aspect ratio
    var im = images[0];

    var aspect = im.width / im.height;
    var w = windowWidth-40;
    var h = w / aspect;
    adminSketch.resizeCanvas(w, h);
  }

function draw() {
    if (images.length === 0) {
        adminSketch.clear();
        return;
    }
    admin_im = images[frame];
    adminSketch.image(admin_im, 0, 0);
}

$(document).ready(function() {
    frame = 0;
    request_exp_list_ajax();
    $('#seg_info').html('');
    $('#exp_select_list').change(function() {
        if(this.value != 'null')
            request_exp_info_ajax(this.value);
        else {
            $('#seg_info').html('');
            $('#user_edit').hide();
            $('frame-visualizer').hide();
        }
   });
   $('#user_list').change(function() {
       $('#edit_download').attr("href", '/download/' + $('#exp_select_list').val() + '/' + this.value);
   });
});
