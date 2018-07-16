from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^get_experiment_list/$', views.get_experiment_list, name='get_experiment_list'),
    url(r'^get_experiment_info/(?P<exp_id>.*)$', views.get_experiment_info, name='get_experiment_info'),
    url(r'^display-image/(?P<exp_id>.*)/(?P<frame_no>[0-9]+)$', views.display_image, name='display_image'),

    # the following URLs were for initial testing, and not in use currently
    url(r'^stream-video/(?P<exp_id>.*)$', views.stream_video, name='stream_video'),
    url(r'^extract-images/(?P<exp_id>.*)$', views.extract_images, name='extract_images'),
    url(r'^read-image/(?P<exp_id>.*)/(?P<img_file_name>.*)$', views.read_image, name='read_image'),
]
