# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import errno
import os
import shutil
import json
from uuid import uuid4

from django.contrib.auth.models import User
from django.template import loader
from django.conf import settings
from django.http import HttpResponse, HttpResponseServerError, StreamingHttpResponse, \
    HttpResponseBadRequest, JsonResponse
from django.views.decorators import gzip
from django.contrib.auth import login, authenticate
from django.shortcuts import render, redirect

from rest_framework import status

from irods.session import iRODSSession
from irods.exception import CollectionDoesNotExist, DataObjectDoesNotExist

from ct_core.utils import read_video, extract_images_from_video, read_image_frame, \
    convert_csv_to_json, get_exp_frame_no, get_seg_collection
from ct_core.forms import SignUpForm
from django_irods.storage import IrodsStorage


# Create your views here.
def index(request):
    #import sys
    #sys.path.append("/home/docker/pycharm-debug")
    #import pydevd
    #pydevd.settrace('172.17.0.1', port=21000, suspend=False)
    if request.user.is_authenticated():
        template = loader.get_template('ct_core/index.html')
        if 'just_signed_up' in request.session:
            context = {'just_signed_up': True}
            del request.session['just_signed_up']
        else:
            context = {}
        return HttpResponse(template.render(context, request))
    else:
        template = loader.get_template('ct_core/home.html')
        context = {}
        return HttpResponse(template.render(context, request))


def signup(request):
    if request.method == 'POST':

        form = SignUpForm(request.POST)
        if form.is_valid():
            form.save(commit=False)
            # concatenate first_name and last_name to create username and append a number if
            # that username already exists to create a unique username
            firstname = form.cleaned_data.get('first_name')
            lastname = form.cleaned_data.get('last_name')
            username = '{}{}'.format(firstname, lastname).lower()
            raw_pwd = form.cleaned_data.get('password1')
            id = 2
            new_username = ''
            ori_username = username
            while new_username != username:
                try:
                    User.objects.get(username=username)
                    # if user already exists, append a increasing number to username and check
                    # again until the username is unique
                    username = ori_username + str(id)
                    id += 1
                except User.DoesNotExist:
                    new_username = username

            User.objects.create_user(
                new_username, first_name=firstname,
                last_name=lastname,
                password=raw_pwd,
            )

            user = authenticate(username=username, password=raw_pwd)
            login(request, user)
            request.session['just_signed_up'] = 'true'
            return redirect('index')
    else:
        form = SignUpForm()
    return render(request, 'registration/signup.html', {'form': form})


def get_experiment_list(request):
    """
    Invoked by an AJAX call and returns json object that holds experiment list in the format below:
    [
      {
        name: string,
        id: string
      }
    ]
    :param request:
    :return:
    """
    exp_list = []
    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        hpath = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER
        coll = session.collections.get(hpath)
        for col in coll.subcollections:
            exp_dict = {}
            exp_dict['id'] = col.name
            try:
                # str() is needed by python irods client metadata method
                key = str('experiment_name')
                col_md = col.metadata.get_one(key)
                exp_dict['name'] = col_md.value
            except KeyError:
                exp_dict['name'] = ''
            exp_list.append(exp_dict)
        return HttpResponse(json.dumps(exp_list), content_type='application/json')

    return HttpResponse(json.dumps({'error': 'Cannot connect to iRODS data server'}),
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_experiment_info(request, exp_id):
    """
    Invoked by an AJAX call and returns json object that holds info of that experiment identified by id
    in the format below:
    {
        frames: number
    }

    :param request:
    :param exp_id: experiment identifier
    :return:
    """
    exp_info = {}
    exp_frame_no = get_exp_frame_no(exp_id)

    if exp_frame_no > 0:
        _, coll, _ = get_seg_collection(exp_id)
        if coll:
            exp_info['hasSegmentation'] = 'true'
        else:
            exp_info['hasSegmentation'] = 'false'
        exp_info['frames'] = exp_frame_no
        exp_info['id'] = exp_id
        return HttpResponse(json.dumps(exp_info), content_type='application/json')
    else:
        HttpResponse(json.dumps({'error': 'Cannot connect to iRODS data server'}),
                     status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


def display_image(request, exp_id, type, frame_no):
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
    irods_img_path = os.path.join(exp_id, 'data', 'image', type)
    file_list = istorage.listdir(irods_img_path)[1]
    flistlen = len(file_list)
    if flistlen <= 0:
        return HttpResponseServerError("Requested experiment does not contain any image")
    if fno > flistlen:
        return HttpResponseBadRequest('Requested frame_no does not exist')
    
    # check whether image frame data in iRODS backend starts with 1 or 0
    if "frame0.jpg" in file_list and frame_no > 0:
        fno -= 1
    img_name = 'frame' + str(fno) + '.jpg'
    if not img_name in file_list:
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
                img_name = 'frame' + frame_no + '.' + type
            elif len(frame_no) > seq_len:
                return HttpResponseBadRequest('Requested frame_no does not exist')
            else:
                # len(frame_no) < seq_len
                zero_cnt = seq_len - len(frame_no)
                packstr = ''
                for i in range(0, zero_cnt):
                    packstr += '0'
                img_name = 'frame' + packstr + frame_no + '.' + type

    ifile = os.path.join(image_path, img_name)
    if os.path.isfile(ifile):
        return HttpResponse(open(ifile, 'rb'), content_type='image/' + type)
    else:
        dest_path = istorage.getOneImageFrame(exp_id, type, img_name, image_path)
        ifile = os.path.join(dest_path, img_name)
        if os.path.isfile(ifile):
            return HttpResponse(open(ifile, 'rb'), content_type='image/' + type)
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


def get_seg_data(request, exp_id):
    json_resp_data = convert_csv_to_json(exp_id)

    if json_resp_data:
        return HttpResponse(json.dumps(json_resp_data), content_type='application/json')
    else:
        return HttpResponse(json.dumps({'error': 'no csv segmentation file can be converted to '
                                                 'JSON response'}),
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_frame_seg_data(request, exp_id, frame_no):
    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        dpath = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER + '/' + str(exp_id) + \
                '/data/segmentation/frame' + str(frame_no) + '.json'
        try:
            fobj = session.data_objects.get(dpath)
            with fobj.open('r') as f:
                json_resp_data = json.load(f)
            return HttpResponse(json.dumps(json_resp_data), content_type='application/json')
        except DataObjectDoesNotExist:
            return JsonResponse({})


def save_tracking_data(request, exp_id):
    uname = request.POST.get('userName', '')
    if not uname:
        return HttpResponseBadRequest("user name is empty")

    traces = request.POST.get('traces', [])
    if not traces:
        return HttpResponseBadRequest("traces array is empty")

    temp_path = os.path.join(settings.IRODS_ROOT, exp_id, uname, uuid4().hex)
    try:
        os.makedirs(temp_path)
    except OSError as ex:
        if ex.errno == errno.EEXIST:
            shutil.rmtree(temp_path)
            os.makedirs(temp_path)
        else:
            return HttpResponseServerError(ex.message)

    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        session.default_resource = settings.IRODS_RESC
        ipath = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER + '/' + str(exp_id) + \
                '/tracking/' + uname
        try:
            coll = session.collections.get(ipath)
        except CollectionDoesNotExist:
            session.collections.create(ipath, recurse=True)
            coll = session.collections.get(ipath)

        trace_no = len(coll.data_objects)
        irods_fname = 'trace_' + str(trace_no) + '.json'
        temp_file_name = os.path.join(temp_path, irods_fname)
        with open(temp_file_name, 'w') as out:
            out.write(json.dumps(traces, indent=4))
        session.data_objects.put(temp_file_name, ipath + '/' + irods_fname)
        shutil.rmtree(temp_path)
        return HttpResponse("Trace has been saved correctly")

    return HttpResponseServerError('iRODS session error')
