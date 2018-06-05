# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import os
import shutil

from django.template import loader
from django.conf import settings
from django.http import HttpResponse, HttpResponseServerError, StreamingHttpResponse

from django.views.decorators import gzip

from ct_core.utils import read_video, exact_images_from_video
from django_irods.storage import IrodsStorage


# Create your views here.
def index(request, session=''):
    #import sys
    #sys.path.append("/home/docker/pycharm-debug")
    #import pydevd
    #pydevd.settrace('152.54.9.92', port=21000, suspend=False)

    template = loader.get_template('ct_core/index.html')
    context = {
        'SITE_TITLE': settings.SITE_TITLE
    }
    return HttpResponse(template.render(context, request))


@gzip.gzip_page
def stream_video(request, exp_id):
    # remove the temp video directory before streaming the new one
    video_path = os.path.join(settings.IRODS_ROOT, 'video')
    if os.path.exists(video_path):
        shutil.rmtree(video_path)
    istorage = IrodsStorage()
    dpath = istorage.getVideo(exp_id, settings.IRODS_ROOT)
    for vfile in os.listdir(dpath):
        # there is supposed to be only one video
        vfilepath = os.path.join(dpath, vfile)
        try:
            return StreamingHttpResponse(read_video(vfilepath), content_type="multipart/x-mixed-replace;boundary=frame")
            #return StreamingHttpResponse(read_video(vfilepath), content_type="image/jpeg")
        except HttpResponseServerError as e:
            return HttpResponseServerError(e.content)

    return HttpResponseServerError('iRODS server error')


def display_images(request, exp_id):
    # remove the temp video directory before streaming the new one
    image_path = os.path.join(settings.IRODS_ROOT, 'image')
    if os.path.exists(image_path):
        shutil.rmtree(image_path)
    istorage = IrodsStorage()
    dpath = istorage.getVideo(exp_id, settings.IRODS_ROOT)
    for vfile in os.listdir(dpath):
        # there is supposed to be only one video
        vfilepath = os.path.join(dpath, vfile)
        ret_img = exact_images_from_video(vfilepath, image_path)
        return StreamingHttpResponse(ret_img, content_type="image/jpeg")
