# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import os
import shutil
import cv2

from django.template import loader
from django.conf import settings
from django.http import HttpResponse, HttpResponseServerError, StreamingHttpResponse

from django.views.decorators import gzip

from ct_core.utils import read_video, extract_images_from_video
from django_irods.storage import IrodsStorage


# Create your views here.
def index(request):
    #import sys
    #sys.path.append("/home/docker/pycharm-debug")
    #import pydevd
    #pydevd.settrace('172.17.0.1', port=21000, suspend=False)

    template = loader.get_template('ct_core/index.html')
    image_file = os.path.join(settings.IRODS_ROOT, 'image', 'frame0.jpg')
    if os.path.isfile(image_file):
        extract = True
    else:
        extract = None

    context = {
        'extract': extract
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


def extract_images(request, exp_id):
    # remove the temp video directory before streaming the new one
    image_path = os.path.join(settings.IRODS_ROOT, 'image')
    if os.path.exists(image_path):
        shutil.rmtree(image_path)
    istorage = IrodsStorage()
    dpath = istorage.getVideo(exp_id, settings.IRODS_ROOT)
    for vfile in os.listdir(dpath):
        # there is supposed to be only one video
        vfilepath = os.path.join(dpath, vfile)
        ret = extract_images_from_video(vfilepath, image_path)

        template = loader.get_template('ct_core/index.html')
        context = {
            'SITE_TITLE': settings.SITE_TITLE,
            'extract': True if ret else None
        }
        return HttpResponse(template.render(context, request))


def display_images(request, frame_no):
    img_name = 'frame{}.jpg'.format(frame_no)
    ifile = os.path.join(settings.IRODS_ROOT, 'image', img_name)
    if os.path.isfile(ifile):
        return HttpResponse(open(ifile, 'rb'), content_type='image/jpg')
        #template = loader.get_template('ct_core/image_display.html')
        #context = {
        #    'img_src': '/static/frames/' + img_name,
        #    'img_text': 'Video frame ' + str(frame_no),
        #    'next_frame_no': str(int(frame_no) + 1)
        #}
        #return HttpResponse(template.render(context, request))

    else:
        return HttpResponseServerError('The requested image frame does not exist on the server')
