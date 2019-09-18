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


var images = {};
var segdata = {};
var numImages;
var numMaxLoadFrames = 10;
var frame = 1; // current frame index within total frames
var startFrame = 1; // start frame index with advancing and reversing frames
var lastSelExpId = '';
var hasSegmentation = 'false';
var userFramesInfo = {};
var userEditFrames = {};

// Create p5 instance for loading images
var adminSketch = new p5(function (sk) {});
var canvas;

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
                select.options[0] = new Option('-- Select an Experiment --', 'null');
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


function request_user_seg_data_ajax(exp_id, frm_idx, username) {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });
    $.ajax({
        type: "POST",
        url: "/get_frame_seg_data/" + exp_id + "/" + frm_idx,
        data: {'username': username},
        success: function (json_response) {
            segdata[frm_idx] = json_response;
            return true;
        },
        error: function (xhr, errmsg, err) {
            console.log(xhr.status + ": " + xhr.responseText + ". Error message: " + errmsg);
            return false;
        }
    });
}


function request_user_frame_info_ajax(exp_id, frm_idx, username) {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });
    $.ajax({
        type: "POST",
        url: "/get_user_frame_info/" + exp_id + "/" + username + "/" + frm_idx,
        success: function (json_response) {
            userFramesInfo[frm_idx] = json_response;
            if (frm_idx == startFrame)
                update_user_edit_info();
            return true;
        },
        error: function (xhr, errmsg, err) {
            console.log(xhr.status + ": " + xhr.responseText + ". Error message: " + errmsg);
            return false;
        }
    });
}


function request_user_total_edit_frames_ajax(exp_id, username) {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });
    $.ajax({
        type: "POST",
        url: "/get_user_total_edit_frames/" + exp_id + "/" + username,
        success: function (json_response) {
            userEditFrames[username] = json_response.edit_frames;
            update_user_edit_info();
            return true;
        },
        error: function (xhr, errmsg, err) {
            console.log(xhr.status + ": " + xhr.responseText + ". Error message: " + errmsg);
            return false;
        }
    });
}


function delete_dict(dict) {
    var prop;
    for (prop in dict) {
        if (dict.hasOwnProperty(prop)) {
            delete dict[prop];
        }
    }
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
            $('#player-control').show();
            let data = json_response;
            numImages = data.frames;
            info_msg = 'This experiment has ' + numImages + ' frames and has segmentation data.';
            $('frame-visualizer').show();
            frame = 1;
            startFrame = 1;
            if(numImages <= numMaxLoadFrames)
                loadNumImages = numImages;
            else
                loadNumImages = numMaxLoadFrames;
            delete_dict(images);
            delete_dict(segdata);
            delete_dict(userFramesInfo);
            delete_dict(userEditFrames);
            // use let to define i is critical to be able to pass i to the call back function -
            // let keyword allows you to declare a variable scoped to the nearest enclosing block
            // and not global like var does.
            // https://www.pluralsight.com/guides/javascript-callbacks-variable-scope-problem
            for(let i=1; i <= loadNumImages; i++) {
                adminSketch.loadImage("/display-image/" + exp_id + "/jpg/" + i, img => {
                    let w = img.width, h = img.height;
                    im = adminSketch.createImage(w, h);
                    im.copy(img, 0, 0, w, h, 0, 0, w, h);
                    images[i] = im;
                    if (i === frame) {
                        resize();
                        image_draw(i);
                    }
                });
            }

            hasSegmentation = data.has_segmentation;
            if (hasSegmentation == 'true') {
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
                    $('#user_list').empty();
                    $('#user_edit').hide();
                    update_user_edit_info();
                    for (frm = 1; frm <= loadNumImages; frm++) {
                        request_user_seg_data_ajax(exp_id, frm, '');
                    }
                }
            }
            else {
                $('#seg_info').html('This experiment has ' + numImages + ' frames and does not has segmentation data.');
                $('#user_edit').hide();
            }
            update_frame_info();
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
    startFrame = 1;
    request_exp_list_ajax();
    $('#seg_info').html('');
    canvas = adminSketch.createCanvas(100, 100);
    canvas.parent('frame-visualizer');
    adminSketch.frameRate(5);
    adminSketch.noLoop();
}

function resize() {
    if (!(1 in images)) return;

    // Size canvas to image aspect ratio
    let im = images[1],
        aspect = im.width / im.height,
        w = $('#frame-visualizer').width(),
        h = w / aspect;
    adminSketch.resizeCanvas(w, h);
  }

function draw() {
    if (frame in segdata && frame in images) {
        segmentation_draw(frame);
    }
}

function image_draw(frame) {
    if (!(frame in images)) {
        adminSketch.clear();
        return;
    }
    let adminIm = images[frame];
    adminSketch.push();
    adminSketch.scale(adminSketch.width / adminIm.width, adminSketch.height / adminIm.height);
    adminSketch.image(adminIm, 0, 0);
    adminSketch.pop();
}

function segmentation_draw(frame) {
    if (!(frame in segdata)) {
        return;
    }

    regions = segdata[frame];
    adminSketch.strokeJoin(adminSketch.ROUND);
    if(regions) {
        regions.forEach(function(region, i, a) {
            let weight = 2;
            let lineBackground = 0;
            let strokeColor = 220;
            let fillColor = 200;
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

            if (region.edited)
                adminSketch.fill(color(fillColor, fillColor, fillColor, fillColor));
            else
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


function update_frame_info() {
    sidx = frame - startFrame + 1;
    $('#frame_info').html(sidx + ' out of loaded ' + loadNumImages +
        ' (' + frame + ' out of total ' + numImages + ')');
}


function update_user_edit_info() {
    if(frame in userFramesInfo) {
        let userName = $('#user_list').val();
        let userFullName = $('#user_list option:selected').text();
        let num_edited = userFramesInfo[frame].num_edited;
        let num_regions = userFramesInfo[frame].num_of_regions;
        $('#user_edit_frm_info').html('This selected user ' + userFullName + ' has edited ' + num_edited +
            ' regions out of total ' + num_regions + ' regions on this active frame. Frames ' +
            'edited by this user: frame ' + userEditFrames[userName] + '.');
    }
    else {
        $('#user_edit_frm_info').html('');
    }
}


$('#delete_exp').click(function(e){
    e.stopPropagation();
    e.preventDefault();
    let expId = $('#exp_select_list').val();
    $.ajax({
        type: "POST",
        url: '/delete_experiment/' + expId + '/',
        success: function (json_response) {
            $('#notification_msg').css({"color": "green"});
            $('#notification_msg').text(json_response.message);
            $('#exp_select_list').find('[value="' + expId + '"]').remove();
            $('#delete_exp').prop('disabled', true);
            return true;
        },
        error: function (xhr, errmsg, err) {
            console.log(xhr.status + ": " + xhr.responseText + ". Error message: " + errmsg);
            $('#notification_msg').css({"color": "red"});
            $('#notification_msg').text(errmsg);
            return false;
        }
    });
});

$('#exp_select_list').change(function(e) {
    e.stopPropagation();
    e.preventDefault();
    $('#notification_msg').text('');
    if(this.value != 'null' && this.val != lastSelExpId) {
        $('#delete_exp').prop('disabled', false);
        request_exp_info_ajax(this.value);
        lastSelExpId = this.value;
        delete_dict(userEditFrames);
        canvas.show();
    }
    else {
        $('#delete_exp').prop('disabled', true);
        $('#seg_info').html('');
        $('#user_edit').hide();
        $('#user_edit_frm_info').html('');
        $('#player-control').hide();
        adminSketch.clear();
        canvas.hide();
        lastSelExpId = -1;
    }
});

$('#user_list').change(function(e) {
    e.stopPropagation();
    e.preventDefault();
    let expId = $('#exp_select_list').val();
    delete_dict(segdata);
    delete_dict(userFramesInfo);
    startFrame = 1;
    frame = 1;
    if (!(this.value in userEditFrames))
        request_user_total_edit_frames_ajax(expId, this.value);
    else
        update_user_edit_info();

    for(let frm = startFrame; frm < startFrame + loadNumImages; frm++) {
        request_user_seg_data_ajax(expId, frm, this.value);
        request_user_frame_info_ajax(expId, frm, this.value);
    }
    image_draw(frame);
    adminSketch.redraw();
    update_frame_info();
    $('#edit_download').attr("href", '/download/' + expId + '/' + this.value);
});

$('#player-step-fwd').click(function(e) {
    e.stopPropagation();
    e.preventDefault();
    if(frame < startFrame+loadNumImages-1) {
        frame = frame + 1;
        image_draw(frame);
        adminSketch.redraw();
        update_frame_info();
        update_user_edit_info();
    }
});

$('#player-step-bwd').click(function(e) {
    e.stopPropagation();
    e.preventDefault();
    if(frame > startFrame)
    {
        frame = frame - 1;
        image_draw(frame);
        adminSketch.redraw();
        update_frame_info();
        update_user_edit_info();
    }
});

$('#player-bwd').click(function(e) {
    e.stopPropagation();
    e.preventDefault();
    if (frame != startFrame) {
        frame = startFrame;
        image_draw(frame);
        adminSketch.redraw();
        update_frame_info();
        update_user_edit_info();
    }
});

$('#player-fwd').click(function(e) {
    e.stopPropagation();
    e.preventDefault();
    if (frame != startFrame + loadNumImages - 1) {
        frame = startFrame + loadNumImages - 1;
        image_draw(frame);
        adminSketch.redraw();
        update_frame_info();
        update_user_edit_info();
    }
});

$('#advance-frames').click(function (e) {
    e.stopPropagation();
    e.preventDefault();
    let startFrmIdx = startFrame + loadNumImages;
    let numLeftImgs = numImages - startFrmIdx + 1;
    if (numLeftImgs > 0) {
        if(numLeftImgs <= numMaxLoadFrames)
                loadNumImages = numLeftImgs;
        else
            loadNumImages = numMaxLoadFrames;
        startFrame = startFrmIdx;
        frame = startFrmIdx;
        let i;
        let loaded = false;
        let expId = $('#exp_select_list').val();
        for(i=0; i < loadNumImages; i++) {
            // use let to define fno is critical to be able to pass fno to the call back function -
            // let keyword allows you to declare a variable scoped to the nearest enclosing block
            // and not global like var does.
            // https://www.pluralsight.com/guides/javascript-callbacks-variable-scope-problem
            let fno = startFrmIdx + i;
            if (!(fno in images)) {
                adminSketch.loadImage("/display-image/" + expId + "/jpg/" + fno, img => {
                    let w = img.width, h = img.height;
                    im = adminSketch.createImage(w, h);
                    im.copy(img, 0, 0, w, h, 0, 0, w, h);
                    images[fno] = im;
                    if (fno === startFrmIdx) {
                        resize();
                        image_draw(fno);
                        loaded = true;
                    }
                });
            }
        }
        if (hasSegmentation == 'true') {
            let userName = $('#user_list').val();
            for (let frm = 0; frm < loadNumImages; frm++) {
                let fno = startFrmIdx + frm;
                if (!(fno in segdata)) {
                    request_user_seg_data_ajax(expId, fno, userName);
                    if (userName) {
                        request_user_frame_info_ajax(expId, fno, userName);
                    }
                    loaded = true;
                }
            }
        }
        if (!loaded) {
            image_draw(frame);
            adminSketch.redraw();
            update_user_edit_info();
        }
        update_frame_info();
    }
});

$('#reverse-frames').click(function (e) {
    e.stopPropagation();
    e.preventDefault();
    if(startFrame > numMaxLoadFrames) {
        startFrame = startFrame - numMaxLoadFrames;
        frame = startFrame;
        image_draw(frame);
        adminSketch.redraw();
        update_frame_info();
        update_user_edit_info();
    }
});
