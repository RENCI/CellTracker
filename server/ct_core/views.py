# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import errno
import os
import shutil
import json
from uuid import uuid4
import logging
import mimetypes

from django.contrib.auth.models import User
from django.template import loader
from django.conf import settings
from django.http import HttpResponse, HttpResponseServerError, StreamingHttpResponse, \
    HttpResponseBadRequest, JsonResponse, HttpResponseForbidden, HttpResponseRedirect, FileResponse
from django.views.decorators import gzip
from django.contrib.auth import login, authenticate
from django.shortcuts import render, redirect
from django.forms.models import inlineformset_factory
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils.datastructures import MultiValueDictKeyError

from rest_framework import status

from irods.session import iRODSSession
from irods.exception import CollectionDoesNotExist

from ct_core.utils import get_experiment_list_util, read_video, \
    extract_images_from_video_to_irods, read_image_frame, get_seg_collection, \
    save_user_seg_data_to_db, get_start_frame, get_exp_image, get_edited_frames, get_all_edit_users, \
    create_user_segmentation_data_for_download, get_frame_info, create_seg_data_from_csv, \
    sync_seg_data_to_db, delete_one_experiment
from ct_core.task_utils import get_exp_frame_no
from ct_core.forms import SignUpForm, UserProfileForm
from ct_core.models import UserProfile, Segmentation, UserSegmentation
from django_irods.storage import IrodsStorage
from django_irods.icommands import SessionException
from ct_core.tasks import add_tracking


logger = logging.getLogger(__name__)


# Create your views here.
def index(request):
    #import sys
    #sys.path.append("/home/docker/pycharm-debug")
    #import pydevd
    #pydevd.settrace('172.17.0.1', port=21000, suspend=False)

    if request.user.is_authenticated():
        if request.user.is_superuser:
            # go to data management page
            template = loader.get_template('ct_core/admin.html')
            context = {}
            return HttpResponse(template.render(context, request))
        else:
            template = loader.get_template('ct_core/index.html')
            if 'just_signed_up' in request.session:
                context = {'just_signed_up': True,
                           'initial_login': True}
                del request.session['just_signed_up']
            else:
                context = {'initial_login': True,
                           'just_signed_up': False}
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
            email = form.cleaned_data.get('email')
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
            up = UserProfile(user=user, grade=grade, school=school, email=email)
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
                                                 fields=('grade', 'school', 'email'),
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
        frames: number,
        id: exp_id,
        has_segmentation: 'true' or 'false'
        start_frame: number
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
            exp_info['has_segmentation'] = 'true'
        else:
            exp_info['has_segmentation'] = 'false'
        exp_info['frames'] = exp_frame_no
        exp_info['id'] = exp_id
        exp_info['edit_users'] = get_all_edit_users(exp_id)
        # check if user has saved edit segmentation to a certain frame, and if so, return the
        # latest frame the user has worked on so that the user can pick up from where he left off
        exp_info['start_frame'] = get_start_frame(request.user, exp_id)

        exp_info['edit_frames'] = get_edited_frames(request.user.username, exp_id)

        return HttpResponse(json.dumps(exp_info), content_type='application/json')
    else:
        HttpResponse(json.dumps({'error': 'Cannot connect to iRODS data server'}),
                     status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@login_required
def get_user_total_edit_frames(request, exp_id, username):
    return JsonResponse({'edit_frames': get_edited_frames(username, exp_id)})


@login_required
def get_user_frame_info(request, exp_id, username, frame_no):
    frame_info = get_frame_info(username, frame_no, exp_id)
    if frame_info:
        return HttpResponse(json.dumps(frame_info), content_type='application/json')
    else:
        return JsonResponse(status=status.HTTP_404_NOT_FOUND)


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
def display_image(request, exp_id, type, frame_no):
    """
    Return requested image to client
    :param request:
    :param exp_id: experiment id
    :param frame_no: image frame sequence number starting from 1
    :return:
    """
    img_file, err_msg = get_exp_image(exp_id, frame_no, type)

    if err_msg:
        return HttpResponseServerError(err_msg)

    return HttpResponse(open(img_file, 'rb'), content_type='image/' + type)


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
    uname = request.POST.get('username', '')
    u = request.user if not uname else User.objects.get(username=uname)
    try:
        seg_obj = UserSegmentation.objects.get(user=u, exp_id=exp_id,
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
            out.write(json.dumps(traces, indent=2))
        session.data_objects.put(temp_file_name, ipath + '/' + irods_fname)
        shutil.rmtree(temp_path)
        return HttpResponse("Trace has been saved correctly")

    return HttpResponseServerError('iRODS session error')


def create_new_experiment(request):
    if request.user.is_authenticated() and request.user.is_superuser:
        template = loader.get_template('ct_core/create_new_exp.html')
        context = {}
        return HttpResponse(template.render(context, request))
    else:
        return HttpResponseForbidden('You have to log in as data manager to create a new '
                                     'experiment')


def add_experiment_to_server(request):
    if request.user.is_authenticated() and request.user.is_superuser:
        exp_name = request.POST.get('exp_name', '')
        exp_id = request.POST.get('exp_id', '')
        if not exp_name:
            messages.error(request, 'Please input a meaningful experiment name.')
            return HttpResponseRedirect(request.META['HTTP_REFERER'])

        upload_video = False
        try:
            exp_img_files = request.FILES.getlist('image_sel_files')
            exp_filename = exp_img_files[0].name
            # validate image frame file name formats
            fname_list = [fn.name for fn in exp_img_files]
            list_len = len(exp_img_files)
            for i in range(list_len):
                fname = 'frame{}.jpg'.format(i + 1)
                if fname not in fname_list:
                    messages.error(request, 'Uploaded image frame does not contain ' + fname)
                    return HttpResponseRedirect(request.META['HTTP_REFERER'])
        except (MultiValueDictKeyError, IndexError):
            try:
                exp_video_file = request.FILES['movie_sel_file']
                exp_filename = exp_video_file.name
                upload_video = True
            except MultiValueDictKeyError:
                messages.error(request, 'Please upload experiment image frames in jpg format or '
                                        'upload an experiment video in avi format.')
                return HttpResponseRedirect(request.META['HTTP_REFERER'])

        seg_csv = False
        try:
            seg_files = request.FILES.getlist('seg_sel_files')
            seg_filename = seg_files[0].name
            # validate segmentation data frame file name formats
            fname_list = [fn.name for fn in seg_files]
            list_len = len(seg_files)
            for i in range(list_len):
                fname = 'frame{}.json'.format(i + 1)
                if fname not in fname_list:
                    messages.error(request, 'Uploaded segmentation data frame does not contain ' +
                                   fname)
                    return HttpResponseRedirect(request.META['HTTP_REFERER'])
        except (MultiValueDictKeyError, IndexError):
            try:
                seg_file = request.FILES['seg_sel_file']
                seg_filename = seg_file.name
                seg_csv = True
            except MultiValueDictKeyError:
                seg_filename = ''

        exp_list, err_msg = get_experiment_list_util()
        if err_msg or not exp_list:
            messages.error(request, "Cannot connect to iRODS server")
            return HttpResponseRedirect(request.META['HTTP_REFERER'])

        id_list = [item['id'] for item in exp_list]
        if not exp_id:
            exp_id = os.path.splitext(exp_filename)[0]
        idx = 1
        while exp_id in id_list:
            # make exp_id unique
            exp_id = '{}_{}'.format(exp_id, idx)
            idx += 1

        istorage = IrodsStorage()
        if upload_video:
            # create new experiment collection in iRODS and transfer uploaded video to iRODS
            retmsg = extract_images_from_video_to_irods(exp_id=exp_id,
                                                        video_input_file=exp_video_file,
                                                        istorage=istorage)
            if retmsg != 'success':
                messages.error(request, retmsg)
                return HttpResponseRedirect(request.META['HTTP_REFERER'])
        else:
            # put image frames in iRODS
            try:
                irods_path = exp_id + '/data/image/jpg/'
                # create image collection first
                istorage.saveFile('', irods_path, create_directory=True)
                for f in exp_img_files:
                    istorage.saveFile(f.temporary_file_path(), irods_path + f.name)
            except SessionException as ex:
                messages.error(request, ex.stderr)
                return HttpResponseRedirect(request.META['HTTP_REFERER'])

        # put experiment data as metadata for the newly created experiment collection
        cpath = '/{}/home/{}/{}'.format(settings.IRODS_ZONE, settings.IRODS_USER, exp_id)
        with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT,
                          user=settings.IRODS_USER,
                          password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
            coll = session.collections.get(cpath)
            coll.metadata.add('experiment_name', exp_name)

        if seg_filename:
            if seg_csv:
                # extract frame segmentation data from uploaded csv file and put them in iRODS
                irods_path = cpath + '/data/segmentation'
                err_msg = create_seg_data_from_csv(exp_id=exp_id,
                                                   input_csv_file=seg_file,
                                                   irods_path=irods_path)
                if err_msg != 'success':
                    messages.error(request, retmsg)
                    return HttpResponseRedirect(request.META['HTTP_REFERER'])
            else:
                # put seg data frames in iRODS
                try:
                    irods_path = cpath + '/data/segmentation/'
                    # create image collection first
                    istorage.saveFile('', irods_path, create_directory=True)
                    for f in seg_files:
                        istorage.saveFile(f.temporary_file_path(), irods_path + f.name)
                except SessionException as ex:
                    messages.error(request, ex.stderr)
                    return HttpResponseRedirect(request.META['HTTP_REFERER'])
            # populate segmentation data in DB from iRODS
            sync_seg_data_to_db(exp_id)

            # add tracking
            add_tracking.apply_async((exp_id,), countdown=1)

        messages.info(request, 'New experiment is added successfully.')
        return HttpResponseRedirect(request.META['HTTP_REFERER'])
    else:
        messages.error(request, 'You have to log in as data manager to add a new experiment '
                                'to the server')
        return HttpResponseRedirect(request.META['HTTP_REFERER'])


def delete_experiment(request, exp_id):
    if request.user.is_authenticated() and request.user.is_superuser:
        ret_msg = delete_one_experiment(exp_id)
        if ret_msg == 'success':
            return JsonResponse({'message': 'Selected experiment deleted successfully'},
                                status=status.HTTP_200_OK)
        else:
            return JsonResponse({'message': ret_msg},
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        return JsonResponse({'message': 'You have to log in as data manager to create a '
                                        'new experiment'},
                            status=status.HTTP_401_UNAUTHORIZED)


@login_required
def save_frame_seg_data(request, exp_id, frame_no):
    seg_data = request.POST.dict()
    num_edited = request.POST.get('num_edited', 0)
    if 'regions' not in seg_data:
        return JsonResponse({'message': 'regions key not included in user edit segmentation data '
                                        'to be saved'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    try:
        save_user_seg_data_to_db(request.user, exp_id, frame_no, seg_data['regions'], num_edited)
        task = add_tracking.apply_async((exp_id, request.user.username, int(frame_no)),
                                        countdown=1)
        return JsonResponse({'task_id': task.task_id}, status=status.HTTP_200_OK)
    except Exception as ex:
        return JsonResponse({'message': ex.message}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def check_task_status(request):
    '''
    A view function to tell the client if the asynchronous add_tracking() task is done.
    Args:
        request: an ajax request to check for add tracking status
    Returns:
        JSON response to return result from asynchronous task add_tracking()
    '''
    task_id = request.POST.get('task_id', None)
    ret_result = {}
    if not task_id:
        ret_result['result'] = None
        ret_result['error'] = 'task_id input is not in request POST data'
        return JsonResponse(ret_result,
                            status=status.HTTP_400_BAD_REQUEST)

    result = add_tracking.AsyncResult(task_id)
    if result.ready():
        try:
            get_result = result.get()
        except Exception as ex:
            ret_result['result'] = None
            ret_result['error'] = ex.message
            return JsonResponse(ret_result,
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        ret_result['result'] = get_result
        return JsonResponse(ret_result,
                            status=status.HTTP_200_OK)
    else:
        return JsonResponse({"result": None},
                            status=status.HTTP_200_OK)


def download(request, exp_id, username):
    zip_data = create_user_segmentation_data_for_download(exp_id, username)
    if not zip_data:
        return JsonResponse(status=status.HTTP_400_BAD_REQUEST)

    zip_fname = os.path.basename(zip_data)
    # obtain mime_type to set content_type
    mtype = 'application-x/octet-stream'
    mime_type = mimetypes.guess_type(zip_data)
    if mime_type[0] is not None:
        mtype = mime_type[0]
    # obtain file size
    stat_info = os.stat(zip_data)
    flen = stat_info.st_size
    f = open(zip_data, 'r')
    response = FileResponse(f, content_type=mtype)
    response['Content-Disposition'] = 'attachment; filename="{name}"'.format(name=zip_fname)
    response['Content-Lengtsh'] = flen
    return response
