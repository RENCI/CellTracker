# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import os
import shutil
import cv2

from django.template import loader
from django.conf import settings
from django.http import HttpResponse, HttpResponseServerError, StreamingHttpResponse, HttpResponseBadRequest

from django.views.decorators import gzip

from ct_core.utils import read_video, extract_images_from_video, read_image_frame
from django_irods.storage import IrodsStorage


# Create your views here.
def index(request):
    #import sys
    #sys.path.append("/home/docker/pycharm-debug")
    #import pydevd
    #pydevd.settrace('172.17.0.1', port=21000, suspend=False)

    template = loader.get_template('ct_core/index.html')
    context = {}
    return HttpResponse(template.render(context, request))


@gzip.gzip_page
def stream_video(request, exp_id):
    # remove the temp video directory before streaming the new one
    input_dest_path = os.path.join(settings.IRODS_ROOT, exp_id)
    video_path = os.path.join(input_dest_path, 'video')
    if not os.path.exists(video_path):
        os.makedirs(video_path)
    if os.path.exists(video_path):
        shutil.rmtree(video_path)
    istorage = IrodsStorage()
    dpath = istorage.getVideo(exp_id, video_path)
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
    # this view function is not used since we now save image sequences directly using ImageJ without dynamic extraction
    # from video. Keep this view function just for future reference.
    # remove the temp image directory before streaming the new one
    input_dest_path = os.path.join(settings.IRODS_ROOT, exp_id)
    image_path = os.path.join(input_dest_path, 'image')
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


def display_image(request, exp_id, frame_no):
    """
    Return requested image to client
    :param request:
    :param exp_id: experiment id
    :param frame_no: image frame sequence number starting from 1
    :return:
    """
    image_path = os.path.join(settings.IRODS_ROOT, exp_id, 'image')
    #if os.path.exists(image_path):
    #    shutil.rmtree(image_path)
    if not os.path.exists(image_path):
        os.makedirs(image_path)
    fno = int(frame_no)
    istorage = IrodsStorage()
    img_path = os.path.join(exp_id, 'data', 'image')
    file_list = istorage.listdir(img_path)[1]
    flistlen = len(file_list)
    if flistlen <= 0:
        return HttpResponseServerError("Requested experiment does not contain any image")
    if fno > flistlen:
        return HttpResponseBadRequest('Requested frame_no does not exist')

    if len(file_list) == 1:
        if fno == 1:
            img_name = file_list[0]
        else:
            return HttpResponseBadRequest('Requested frame_no does not exist')
    else:
        img1_name = file_list[0]
        start_idx = len('frame')
        seq_len = len(img1_name[start_idx:-4])
        if len(frame_no) == seq_len:
            img_name = 'frame' + frame_no + '.png'
        elif len(frame_no) > seq_len:
            return HttpResponseBadRequest('Requested frame_no does not exist')
        else:
            # len(frame_no) < seq_len
            zero_cnt = seq_len - len(frame_no)
            packstr = ''
            for i in range(0, zero_cnt):
                packstr += '0'
            img_name = 'frame' + packstr + frame_no + '.png'

    ifile = os.path.join(image_path, img_name)
    if os.path.isfile(ifile):
        return HttpResponse(open(ifile, 'rb'), content_type='image/png')
    else:
        dest_path = istorage.getOneImageFrame(exp_id, img_name, image_path)
        ifile = os.path.join(dest_path, img_name)
        if os.path.isfile(ifile):
            return HttpResponse(open(ifile, 'rb'), content_type='image/png')
        else:
            return HttpResponseServerError('Requested image frame does not exist')


def read_image(request, exp_id, img_file_name):
    # this view function is not used, but kept here for future reference
    ret_dict = read_image_frame(exp_id, img_file_name)
    if ret_dict:
        context = {'img_dict': ret_dict,
                   "image_frame_name": img_file_name
                   }
        template = loader.get_template('ct_core/img_values.html')
        return HttpResponse(template.render(context, request))
    else:
        return HttpResponseServerError('Requested image frame does not exist')
