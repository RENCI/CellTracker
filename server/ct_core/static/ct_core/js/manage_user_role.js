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
    //Moves selected item(s) from sourceList to destinationList and deleting the
    // selected item(s) from the source list
    $.fn.moveToListAndDelete = function (sourceList, destinationList) {
        var opts = $(sourceList + ' option:selected');
        if (opts.length > 0) {
            $(opts).remove();
            $(destinationList).append($(opts).clone());
        }
    };
})(jQuery);

$('#btnRight').click(function (e) {
    $('select').moveToListAndDelete('#ru_lstbox', '#pu_lstbox');
    e.preventDefault();
    // Important to include the statement below, otherwise, the event handler'd be called twice
    e.stopImmediatePropagation();
});
$('#btnLeft').click(function (e) {
    $('select').moveToListAndDelete('#pu_lstbox', '#ru_lstbox');
    e.preventDefault();
    // Important to include the statement below, otherwise, the event handler'd be called twice
    e.stopImmediatePropagation();
});
$('#btnUpdateUserRole').click(function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
            }
        }
    });
    reg_users_data = JSON.stringify($('#ru_lstbox option').val());
    power_users_data = JSON.stringify($('#pu_lstbox option').val());
    $.ajax({
        type: "POST",
        url: "/update_user_role/",
        data: {
            reg_users: reg_users_data,
            pow_users: power_users_data
        },
        success: function(result) {
            $('#infomsg').text(result['message']);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            $('#errmsg').text("Failed to update user roles: " + errorThrown);
        }
    });

    // don't submit the form
    return false;
});
