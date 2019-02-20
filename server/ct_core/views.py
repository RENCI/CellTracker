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
    HttpResponseBadRequest, JsonResponse, HttpResponseForbidden, HttpResponseRedirect
from django.views.decorators import gzip
from django.contrib.auth import login, authenticate
from django.shortcuts import render, redirect
from django.forms.models import inlineformset_factory
from django.contrib.auth.decorators import login_required
from django.contrib import messages

from rest_framework import status

from irods.session import iRODSSession
from irods.exception import CollectionDoesNotExist

from ct_core.utils import get_experiment_list_util, read_video, extract_images_from_video, \
    read_image_frame, get_exp_frame_no, get_seg_collection, \
    save_user_seg_data_to_db
from ct_core.forms import SignUpForm, UserProfileForm
from ct_core.models import UserProfile, Segmentation, UserSegmentation
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
            context = {'just_signed_up': True,
                       'initial_login': True}
            del request.session['just_signed_up']
        else:
            context = {'initial_login': True}
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
            grade = form.cleaned_data.get('grade')
            school = form.cleaned_data.get('school')
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
            up = UserProfile(user=user, grade=grade, school=school)
            up.save()
            login(request, user)
            request.session['just_signed_up'] = 'true'
            return redirect('index')
    else:
        form = SignUpForm()
    return render(request, 'registration/signup.html', {'form': form})


@login_required
def edit_user(request, pk):
    user = User.objects.get(pk=pk)
    user_form = UserProfileForm(instance=user)

    if not user.is_authenticated() or request.user.id != user.id:
        return HttpResponseForbidden('You are not authenticated to edit user profile')

    ProfileInlineFormset = inlineformset_factory(User, UserProfile,
                                                 fields=('grade', 'school'),
                                                 can_delete=False)
    formset = ProfileInlineFormset(instance=user)

    if request.method == "POST":
        user_form = UserProfileForm(request.POST, instance=user)
        formset = ProfileInlineFormset(request.POST, instance=user)
        if user_form.is_valid():
            created_user = user_form.save(commit=False)
            formset = ProfileInlineFormset(request.POST, instance=created_user)
            if formset.is_valid():
                created_user.save()
                formset.save()
                messages.info(request, "Your profile is updated successfully")
                return HttpResponseRedirect(request.META['HTTP_REFERER'])

    return render(request, 'accounts/account_update.html', {"profile_form": user_form,
                                                     "formset": formset})


@login_required
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
    exp_list, err_msg = get_experiment_list_util()
    if exp_list:
        return HttpResponse(json.dumps(exp_list), content_type='application/json')
    if err_msg:
        return HttpResponse(json.dumps({'error': 'Cannot connect to iRODS data server'}),
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@login_required
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


@login_required
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


@login_required
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


@login_required
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


@login_required
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


@login_required
def get_frame_seg_data(request, exp_id, frame_no):
    # check if user edit segmentation is available and if yes, use that instead
    try:
        seg_obj = UserSegmentation.objects.get(user=request.user, exp_id=exp_id,
                                               frame_no=int(frame_no))
    except UserSegmentation.DoesNotExist:
        try:
            seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=int(frame_no))
        except Segmentation.DoesNotExist:
            seg_obj = None

    if seg_obj:
        json_resp_data = seg_obj.data
        if json_resp_data:
            return HttpResponse(json.dumps(json_resp_data), content_type='application/json')
        else:
            return JsonResponse({})
    else:
        return JsonResponse({})


@login_required
def save_tracking_data(request, exp_id):
    uname = request.user.username

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


@login_required
def save_frame_seg_data(request, exp_id, frame_no):
    seg_data = request.POST.dict()
    if 'regions' not in seg_data:
        return JsonResponse({'message': 'regions key not included in user edit segmentation data '
                                        'to be saved'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    try:
        save_user_seg_data_to_db(request.user, exp_id, frame_no, seg_data['regions'])
        return JsonResponse({}, status=status.HTTP_200_OK)
    except Exception as ex:
        return JsonResponse({'message':ex.message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
