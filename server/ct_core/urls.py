from django.conf.urls import url
from django.contrib.auth import views as auth_views

from ct_core import views


urlpatterns = [
    url(r'^login/$', auth_views.login, name='login'),
    url(r'^logout/$', auth_views.logout, {'next_page': '/'}, name='logout'),
    url(r'^signup/$', views.signup, name='signup'),
    url(r'^accounts/update/(?P<pk>[\-\w]+)/$', views.edit_user, name='account_update'),

    url(r'^$', views.index, name='index'),
    url(r'^get_experiment_list/$', views.get_experiment_list, name='get_experiment_list'),
    url(r'^get_experiment_info/(?P<exp_id>.*)$', views.get_experiment_info,
        name='get_experiment_info'),
    url(r'^display-image/(?P<exp_id>.*)/(?P<type>png|jpg)/(?P<frame_no>[0-9]+)$',
        views.display_image, name='display_image'),

    # the following URLs were for initial testing, and not in use currently
    url(r'^stream-video/(?P<exp_id>.*)$', views.stream_video, name='stream_video'),
    url(r'^extract-images/(?P<exp_id>.*)$', views.extract_images, name='extract_images'),
    url(r'^read-image/(?P<exp_id>.*)/(?P<img_file_name>.*)$', views.read_image, name='read_image'),
    url(r'^save_tracking_data/(?P<exp_id>.*)$', views.save_tracking_data,
        name='save_tracking_data'),
    url(r'^get_frame_seg_data/(?P<exp_id>.*)/(?P<frame_no>[0-9]+)$', views.get_frame_seg_data,
        name='get_frame_seg_data'),
    url(r'^save_segmentation_data/(?P<exp_id>.*)/(?P<frame_no>[0-9]+)$', views.save_frame_seg_data,
        name='save_frame_seg_data'),
    url(r'^check_task_status/$', views.check_task_status, name='check_task_status'),
    url(r'^download/(?P<exp_id>.*)/(?P<username>.*)$', views.download, name='download'),
]
