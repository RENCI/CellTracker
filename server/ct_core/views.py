# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import mimetypes
import os
import shutil

from django.template import loader
from django.conf import settings
from django.http import HttpResponse, FileResponse, HttpResponseServerError

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


def stream_video(request, exp_id):
    # remove the temp video directory before streaming the new one
    video_path = os.path.join(settings.IRODS_ROOT, 'video')
    if os.path.exists(video_path):
        shutil.rmtree(video_path)
    istorage = IrodsStorage()
    dpath = istorage.getVideo(exp_id, settings.IRODS_ROOT)
    for vfile in os.listdir(dpath):
        # there is supposed to be only one video
        ipath = os.path.join(exp_id, 'data', 'video', vfile)
        fsize = istorage.size(ipath)
        vfilepath = os.path.join(dpath, vfile)
        with open(vfilepath, 'rb') as fobj:
            mtype = 'application-x/octet-stream'
            mime_type = mimetypes.guess_type(vfile)
            if mime_type[0] is not None:
                mtype = mime_type[0]
            fobj_stream = fobj.read()
            response = FileResponse(fobj_stream, content_type=mtype)
            response['Content-Disposition'] = 'attachment; filename="{name}"'.format(
                name=vfile)
            response['Content-Length'] = fsize
            return response

    return HttpResponseServerError('iRODS server error')


def display_images(request, exp_id):
    # remove the temp video directory before streaming the new one
    image_path = os.path.join(settings.IRODS_ROOT, 'image')
    if os.path.exists(image_path):
        shutil.rmtree(image_path)
    istorage = IrodsStorage()
    dpath = istorage.getAllImages(exp_id, settings.IRODS_ROOT)
    file_list = []
    for ifile in os.listdir(dpath):
        file_list.append(ifile)

    return HttpResponse(','.join(file_list))
