from django.conf.urls import url
from django.contrib.auth import views as auth_views

from ct_core import views


urlpatterns = [
    url(r'^login/$', auth_views.LoginView.as_view(), name='login'),
    url(r'^logout/$', views.logout, name='logout'),
    url(r'^password_reset/done/$', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),
    url(r'^reset/(?P<uidb64>[0-9A-Za-z_\-]+)/(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})/$',
        auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    url(r'^reset/done/$', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),
    url(r'^reset_password_request/$', views.RequestPasswordResetView.as_view(),
        name='reset_password_request'),
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
    url(r'^read-image/(?P<exp_id>.*)/(?P<img_file_name>.*)$', views.read_image, name='read_image'),
    url(r'^save_tracking_data/(?P<exp_id>.*)$', views.save_tracking_data,
        name='save_tracking_data'),
    url(r'^get_frame_seg_data/(?P<exp_id>.*)/(?P<frame_no>[0-9]+)$', views.get_frame_seg_data,
        name='get_frame_seg_data'),
    url(r'^save_segmentation_data/(?P<exp_id>.*)/(?P<frame_no>[0-9]+)$', views.save_frame_seg_data,
        name='save_frame_seg_data'),
    url(r'^check_task_status/$', views.check_task_status, name='check_task_status'),
    url(r'^download/(?P<exp_id>.*)/(?P<username>.*)$', views.download, name='download'),
    url(r'^get_user_frame_info/(?P<exp_id>.*)/(?P<username>.*)/(?P<frame_no>[0-9]+)$',
        views.get_user_frame_info, name='get_user_frame_info'),
    url(r'^get_user_total_edit_frames/(?P<exp_id>.*)/(?P<username>.*)$',
        views.get_user_total_edit_frames, name='get_user_total_edit_frames'),
    url(r'^create_new_experiment/$', views.create_new_experiment, name='create_new_experiment'),
    url(r'^delete_experiment/(?P<exp_id>.*)/$', views.delete_experiment, name='delete_experiment'),
    url(r'^add_experiment_to_server/$', views.add_experiment_to_server, name='add_experiment_to_server'),
    url(r'^get_user_info/$', views.get_user_info, name='get_user_info'),
    url(r'^manage_user_role/$', views.manage_user_role, name='manage_user_role'),
    url(r'^update_user_role/$', views.update_user_role, name='update_user_role'),
    url(r'^sort_task_priority/$', views.sort_task_priority, name='sort_task_priority'),
    url(r'^update_task_priority/$', views.update_task_priority, name='update_task_priority'),
    url(r'^update_label_association/(?P<exp_id>.*)/$', views.update_label_association, name='update_label_association'),
    url(r'^get_score/(?P<exp_id>.*)/(?P<frame_no>[0-9]+)$', views.get_score, name='get_score'),
]
