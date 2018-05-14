from django.conf.urls import url

from . import views


urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^stream-video/(?P<path>.*)$', views.stream_video, name='stream_video'),
]
