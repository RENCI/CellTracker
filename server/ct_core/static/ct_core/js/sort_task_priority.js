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

/**
 * This is adapted from jQuery.SelectListActions
 * https://github.com/esausilva/jquery.selectlistactions.js
 */

(function ($) {
    //Moves selected item(s) up or down in a list
    $.fn.moveUpDown = function (list, btnUp, btnDown) {
        var opts = $(list + ' option:selected');
        if (opts.length > 0) {
            if (btnUp) {
                opts.first().prev().before(opts);
            } else if (btnDown) {
                opts.last().next().after(opts);
            }
        }
    };
})(jQuery);

$('#btnUp').click(function (e) {
    $('select').moveUpDown('#task_lstbox', true, false);
    e.preventDefault();
    // Important to include the statement below, otherwise, the event handler'd be called twice
    e.stopImmediatePropagation();
});
$('#btnDown').click(function (e) {
    $('select').moveUpDown('#task_lstbox', false, true);
    e.preventDefault();
    // Important to include the statement below, otherwise, the event handler'd be called twice
    e.stopImmediatePropagation();
});
$('#btnUpdateTaskLst').click(function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });

    let task_list = [];
    let item_list = $('#task_lstbox option');
    let idx;
    for (idx=0; idx < item_list.length; idx++) {
        task_list[idx] = item_list[idx].value;
    }

    var task_data = JSON.stringify(task_list);
    $.ajax({
        type: "POST",
        url: "/update_task_priority/",
        data: {
            task_list: task_data
        },
        success: function(result) {
            $('#infomsg').text(result['message']);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            $('#errmsg').text("Failed to update task list priority: " + errorThrown);
        }
    });

    // don't submit the form
    return false;
});
