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
var segdata = [];
var numImages;
var frame = 1;
var numMaxLoadFrames = 10;
var lastSelExpId = '';
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

function normalizePoint(p) {
return [p[0] / adminSketch.width, p[1] / adminSketch.height];
}

function scalePoint(p) {
return [p[0] * adminSketch.width, p[1] * adminSketch.height];
}

function request_user_seg_data_ajax(exp_id, username) {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });
    $.ajax({
        type: "POST",
        url: "/get_frame_seg_data/" + exp_id + "/" + frame,
        data: {'username': username},
        success: function (json_response) {
            segdata.length = 0;
            segdata.push(json_response);
            return true;
        },
        error: function (xhr, errmsg, err) {
            console.log(xhr.status + ": " + xhr.responseText + ". Error message: " + errmsg);
            return false;
        }
    });
};


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
            segdata.length = 0;
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
                    request_user_seg_data_ajax(exp_id, '');
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
            var i;
            for(i=1; i <= loadNumImages; i++) {
                adminSketch.loadImage("/display-image/" + exp_id + "/jpg/" + i, img => {
                    let w = img.width, h=img.height;
                    im = adminSketch.createImage(w, h);
                    im.copy(img, 0, 0, w, h, 0, 0, w, h);
                    images.push(im);
                    if (images.length === 1) {
                        resize();
                        image_draw(frame);
                    }
                });
            }

            return true;
        },
        error: function (xhr, errmsg, err) {
            console.log(xhr.status + ": " + xhr.responseText + ". Error message: " + errmsg);
            return false;
        }
    });
}

function setup() {
    frame = 1;
    request_exp_list_ajax();
    $('#seg_info').html('');
    var canvas = adminSketch.createCanvas(100, 100);
    canvas.parent('frame-visualizer');
    adminSketch.frameRate(5);
    adminSketch.noLoop();
}

function resize() {
    if (images.length === 0) return;

    // Size canvas to image aspect ratio
    let im = images[0],
        aspect = im.width / im.height,
        w = $('#frame-visualizer').width(),
        h = w / aspect;
    adminSketch.resizeCanvas(w, h);
  }

function draw() {
    if (segdata.length > 0 && images.length > 0) {
        segmentation_draw(frame);
    }
}

function image_draw(frame) {
    if (images.length === 0) {
        adminSketch.clear();
        return;
    }
    admin_im = images[frame-1];
    adminSketch.push();
    adminSketch.scale(adminSketch.width / admin_im.width, adminSketch.height / admin_im.height);
    adminSketch.image(admin_im, 0, 0);
    adminSketch.pop();
}

function segmentation_draw(frame) {
    if (segdata.length === 0) {
        return;
    }
    regions = segdata[frame-1];
    adminSketch.strokeJoin(adminSketch.ROUND);
    if(regions) {
        regions.forEach(function(region, i, a) {
            let weight = 2;
            let lineBackground = 0;
            let strokeColor = 220;
            // Draw outline background
            adminSketch.stroke(lineBackground);
            adminSketch.strokeWeight(weight+1);
            adminSketch.noFill();

            adminSketch.beginShape();
            region.vertices.forEach(function(vertex) {
              const v = scalePoint(vertex);
              adminSketch.vertex(v[0], v[1]);
            });
            if (region.vertices.length > 0) {
              const v = scalePoint(region.vertices[0]);
              adminSketch.vertex(v[0], v[1]);
            }
            adminSketch.endShape();
            // Draw outline
            adminSketch.stroke(strokeColor);
            adminSketch.strokeWeight(weight);

            adminSketch.noFill();

            // Draw outline
            adminSketch.beginShape();
            region.vertices.forEach(function(vertex) {
              const v = scalePoint(vertex);
              adminSketch.vertex(v[0], v[1]);
            });
            if (region.vertices.length > 0) {
              const v = scalePoint(region.vertices[0]);
              adminSketch.vertex(v[0], v[1]);
            }
            adminSketch.endShape();
        });
    }
}

$('#exp_select_list').change(function(e) {
    e.stopPropagation();
    e.preventDefault();
    if(this.value != 'null' && this.val != lastSelExpId) {
        request_exp_info_ajax(this.value);
        lastSelExpId = this.value;
    }
    else {
        $('#seg_info').html('');
        $('#user_edit').hide();
        $('frame-visualizer').hide();
    }
});

$('#user_list').change(function(e) {
    e.stopPropagation();
    e.preventDefault();
    let exp_id = $('#exp_select_list').val();
    request_user_seg_data_ajax(exp_id, this.value);
    $('#edit_download').attr("href", '/download/' + exp_id + '/' + this.value);
});
