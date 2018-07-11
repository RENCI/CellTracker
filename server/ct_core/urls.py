from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^stream-video/(?P<exp_id>.*)$', views.stream_video, name='stream_video'),
    url(r'^extract-images/(?P<exp_id>.*)$', views.extract_images, name='extract_images'),
    url(r'^display-images/(?P<frame_no>[0-9]+)$', views.display_images, name='display_images'),
    url(r'^read-image/(?P<frame_no>[0-9]+)$', views.read_image, name='read_image'),
]
