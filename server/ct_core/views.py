import errno
import os
import shutil
import json
from uuid import uuid4
import logging
import mimetypes
from collections import OrderedDict

from django.template import loader
from django.conf import settings
from django.http import HttpResponse, HttpResponseServerError, StreamingHttpResponse, \
    HttpResponseBadRequest, JsonResponse, HttpResponseForbidden, HttpResponseRedirect, FileResponse
from django.views.decorators import gzip
from django.contrib.auth import login, authenticate
from django.contrib.auth.views import PasswordResetView, LogoutView
from django.shortcuts import render, redirect
from django.forms.models import inlineformset_factory
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils.datastructures import MultiValueDictKeyError
from django.db import IntegrityError
from django.contrib.auth.models import User
from rest_framework import status

from irods.session import iRODSSession
from irods.exception import CollectionDoesNotExist

from scoring_module import get_edit_score

from ct_core.utils import get_experiment_list_util, read_video, \
    extract_images_from_video_to_irods, read_image_frame, get_seg_collection, \
    save_user_seg_data_to_db, get_start_frame, get_exp_image, get_edited_frames, get_all_edit_users, \
    create_user_segmentation_data_for_download, get_frame_info, create_seg_data_from_csv, \
    sync_seg_data_to_db, delete_one_experiment, get_users, update_experiment_priority, pack_zeros, \
    is_exp_locked, lock_experiment, release_locks_by_user, add_labels_to_exp, get_exp_labels
from ct_core.task_utils import get_exp_frame_no, is_power_user
from ct_core.forms import SignUpForm, UserProfileForm, UserPasswordResetForm
from ct_core.models import UserProfile, Segmentation, UserSegmentation
from django_irods.storage import IrodsStorage
from django_irods.icommands import SessionException
from ct_core.tasks import add_tracking, sync_user_edit_frame_from_db_to_irods


logger = logging.getLogger(__name__)


# Create your views here.
def index(request):
    #import sys
    #sys.path.append("/home/docker/pycharm-debug")
    #import pydevd_pycharm
    #pydevd_pycharm.settrace('172.17.0.1', port=21000, suspend=False)

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


class RequestPasswordResetView(PasswordResetView):
    form_class = UserPasswordResetForm


@login_required
def logout(request):
    if request.user.is_authenticated():
        release_locks_by_user(request.user)
    return LogoutView.as_view(
        next_page='/'
    )(request)


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
            try:
                up.save()
            except IntegrityError as ex:
                # violate email uniqueness, raise error and roll back
                user.delete()
                return render(request, 'registration/signup.html', {'form': form,
                                                                    'error_message': ex.message})
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
                created_user.email = formset.cleaned_data[0]['email']
                created_user.save()
                formset.save()
                messages.info(request, "Your profile is updated successfully")
                return HttpResponseRedirect(request.META['HTTP_REFERER'])

    is_pu = is_power_user(user)
    return render(request, 'accounts/account_update.html', {"profile_form": user_form,
                                                            "formset": formset,
                                                            "total_score": user.user_profile.score,
                                                            "is_poweruser": is_pu})


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
    exp_list, err_msg = get_experiment_list_util(request.user)
    if exp_list:
        return HttpResponse(json.dumps(exp_list), content_type='application/json')
    if err_msg:
        return HttpResponse(json.dumps({'error': 'Cannot connect to iRODS data server'}),
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@login_required
def get_user_info(request):
    """
    return request user info if username GET parameter is not in the request; otherwise, return user info
    for the username in GET parameter
    :param request:
    :return: user info in JSON format
    """
    user_name = request.GET.get('username', request.user.username)
    up = UserProfile.objects.filter(user__username=user_name).first()
    if up:
        return JsonResponse(status=status.HTTP_200_OK,
                            data={'username': user_name,
                                  'first_name': up.user.first_name,
                                  'last_name': up.user.last_name,
                                  'email': up.email,
                                  'grade': up.grade,
                                  'school': up.school,
                                  'total_score': up.score,
                                  'is_power_user': 'true' if is_power_user(up.user) else 'false'
                                  })
    else:
        return JsonResponse(status=status.HTTP_400_BAD_REQUEST,
                            data={'error': "Requested user info for user {} does not exist".format(user_name)})


@login_required
def get_experiment_info(request, exp_id):
    """
    Invoked by an AJAX call and returns json object that holds info of that experiment identified by id
    in the format below:
    {
        frames: number,
        id: exp_id,
        has_segmentation: 'true' or 'false'
        start_frame: number,
        edit_frames: str, frame numbers separated by comma
        labels: str - labels separated by semicolon
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
            locked, lock_user = is_exp_locked(exp_id)
            if locked and lock_user.username != request.user.username:
                # experiment is locked by another user
                exp_info['locked_by'] = lock_user.username
                return JsonResponse(exp_info, status=status.HTTP_403_FORBIDDEN)
            else:
                # lock the experiment
                if is_power_user(request.user):
                    lock_experiment(exp_id, request.user)
            exp_info['has_segmentation'] = 'true'
            exp_info['labels'] = get_exp_labels(exp_id)
        else:
            exp_info['has_segmentation'] = 'false'
        exp_info['frames'] = exp_frame_no
        exp_info['id'] = exp_id
        exp_info['edit_users'] = get_all_edit_users(exp_id)
        # check if user has saved edit segmentation to a certain frame, and if so, return the
        # latest frame the user has worked on so that the user can pick up from where he left off
        exp_info['start_frame'] = get_start_frame(request.user, exp_id)

        exp_info['edit_frames'] = get_edited_frames(request.user.username, exp_id)

        return JsonResponse(exp_info, status=status.HTTP_200_OK)
    else:
        JsonResponse({'error': 'Cannot connect to iRODS data server'},
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
    dpath = istorage.get_video(exp_id, video_path)
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
    locked, lock_user = is_exp_locked(exp_id)
    if locked and lock_user.username != request.user.username:
        # experiment is locked by another user
        return JsonResponse({'locked_by': lock_user.username}, status=status.HTTP_403_FORBIDDEN)

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
    locked, lock_user = is_exp_locked(exp_id)
    if locked and lock_user.username != u.username:
        # experiment is locked by another user
        return JsonResponse({'locked_by': lock_user.username}, status=status.HTTP_403_FORBIDDEN)
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


@login_required
def create_new_experiment(request):
    if request.user.is_authenticated() and request.user.is_superuser:
        template = loader.get_template('ct_core/create_new_exp.html')
        context = {}
        return HttpResponse(template.render(context, request))
    else:
        return HttpResponseForbidden('You must log in as data manager to create a new '
                                     'experiment')


@login_required
def manage_user_role(request):
    if request.user.is_authenticated() and request.user.is_superuser:
        template = loader.get_template('ct_core/manage_user_role.html')
        power_users, reg_users = get_users()
        context = {
            'reg_users': reg_users,
            'power_users': power_users
        }
        return HttpResponse(template.render(context, request))
    else:
        return HttpResponseForbidden('You must log in as data manager to manage user roles')


@login_required
def update_user_role(request):
    # request should be AJAX
    reg_users  = request.POST.get('reg_users', '')
    power_users = request.POST.get('pow_users', '')
    if not reg_users and not power_users:
        if UserProfile.objects.all().count() > 0:
            return JsonResponse(status=status.HTTP_400_BAD_REQUEST,
                                data={'status': 'false',
                                      'message': "Request user lists are empty"})
        else:
            return JsonResponse(status=status.HTTP_200_OK,
                                data={'message': "No users to update roles for"})

    for u in User.objects.all().filter(is_staff=False, is_superuser=False, is_active=True):
        if u.username in power_users:
            u.user_profile.role = UserProfile.POWERUSER
            u.user_profile.save()
        elif u.username in reg_users:
            u.user_profile.role = UserProfile.REGULARUSER
            u.user_profile.save()

    return JsonResponse(status=status.HTTP_200_OK,
                        data={'message': "User roles are updated successfully"})


@login_required
def sort_task_priority(request):
    if request.user.is_authenticated() and request.user.is_superuser:
        template = loader.get_template('ct_core/sort_task_priority.html')
        exp_list, err_msg = get_experiment_list_util()
        if exp_list:
            task_dict = OrderedDict()
            for exp_dict in exp_list:
                task_dict[exp_dict['id']] = exp_dict['name']
            context = {
                'tasks': task_dict
            }
            return HttpResponse(template.render(context, request))
        if err_msg:
            return HttpResponse(json.dumps({'error': 'Cannot connect to iRODS data server'}),
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    else:
        return HttpResponseForbidden('You must log in as data manager to sort task priorities')


@login_required
def update_task_priority(request):
    # request should be AJAX
    task_list = request.POST.get('task_list', '')
    if not task_list:
        return JsonResponse(status=status.HTTP_400_BAD_REQUEST,
                            data={'status': 'false',
                                  'message': "Request task list to set priority is empty"})

    try:
        task_list = json.loads(task_list)
        update_experiment_priority(task_list)
    except Exception as ex:
        return JsonResponse(status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            data={'status': 'false',
                                  'message': ex.message})

    return JsonResponse(status=status.HTTP_200_OK,
                        data={'message': "Experiment task priority order is updated successfully"})


@login_required
def add_experiment_to_server(request):
    if request.user.is_authenticated() and request.user.is_superuser:
        exp_name = request.POST.get('exp_name', '')
        exp_id = request.POST.get('exp_id', '')
        exp_labels = request.POST.get('exp_label', '')
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
                istorage.save_file('', irods_path, create_directory=True)
                for f in exp_img_files:
                    istorage.save_file(f.temporary_file_path(), irods_path + f.name)
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
            coll.metadata.add('priority', pack_zeros(str(len(exp_list))))

            if exp_labels:
                try:
                    add_labels_to_exp(coll, exp_labels)
                except Exception as ex:
                    messages.error(request, str(ex))
                    return HttpResponseRedirect(request.META['HTTP_REFERER'])

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
                    istorage.save_file('', irods_path, create_directory=True)
                    for f in seg_files:
                        istorage.save_file(f.temporary_file_path(), irods_path + f.name)
                except SessionException as ex:
                    messages.error(request, ex.stderr)
                    return HttpResponseRedirect(request.META['HTTP_REFERER'])
            # populate segmentation data in DB from iRODS
            tracking_exist = sync_seg_data_to_db(exp_id)
            if not tracking_exist:
                # add tracking
                add_tracking.apply_async((exp_id,), countdown=1)

        messages.info(request, 'New experiment is added successfully.')
        return HttpResponseRedirect(request.META['HTTP_REFERER'])
    else:
        messages.error(request, 'You must log in as data manager to add a new experiment '
                                'to the server')
        return HttpResponseRedirect(request.META['HTTP_REFERER'])


@login_required
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
        return JsonResponse({'message': 'You must log in as data manager to create a '
                                        'new experiment'},
                            status=status.HTTP_401_UNAUTHORIZED)


@login_required
def update_label_association(request, exp_id):
    if request.user.is_authenticated() and request.user.is_superuser:
        exp_labels = request.POST.get('exp_label', '')
        if not exp_labels:
            return JsonResponse({"message": 'Bad request: input labels are empty'}, status=status.HTTP_400_BAD_REQUEST)
        cpath = '/{}/home/{}/{}'.format(settings.IRODS_ZONE, settings.IRODS_USER, exp_id)
        with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT,
                          user=settings.IRODS_USER,
                          password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
            try:
                coll = session.collections.get(cpath)
            except CollectionDoesNotExist:
                return JsonResponse({"message": 'Bad request: input experiment id does not exist'},
                                    status=status.HTTP_400_BAD_REQUEST)

            try:
                add_labels_to_exp(coll, exp_labels)
            except Exception as ex:
                return JsonResponse({"message": str(ex)},
                                    status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return JsonResponse({'message': 'Labels are associated with experiment {} successfully'.format(exp_id)},
                            status=status.HTTP_200_OK)
    else:
        return JsonResponse({'message': 'You must log in as data manager to associate labels to experiments'},
                            status=status.HTTP_401_UNAUTHORIZED)


@login_required
def save_frame_seg_data(request, exp_id, frame_no):
    seg_data = request.POST.dict()
    num_edited = request.POST.get('num_edited', 0)
    if 'regions' not in seg_data:
        return JsonResponse({'message': 'regions key not included in user edit segmentation data '
                                        'to be saved'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    locked, lock_user = is_exp_locked(exp_id)
    if locked and lock_user.username != request.user.username:
        # experiment is locked by another user
        return JsonResponse({'locked_by': lock_user.username}, status=status.HTTP_403_FORBIDDEN)
    try:
        save_user_seg_data_to_db(request.user, exp_id, frame_no, seg_data['regions'], num_edited)
        #task = add_tracking.apply_async((exp_id, request.user.username, int(frame_no)),
        #                                countdown=1)
        #return JsonResponse({'task_id': task.task_id}, status=status.HTTP_200_OK)
        sync_user_edit_frame_from_db_to_irods.apply_async((exp_id, request.user.username, int(frame_no)), countdown=1)
        return JsonResponse({}, status=status.HTTP_200_OK)
    except Exception as ex:
        err_msg = "Cannot save segmentation data: {}".format(ex)
        logger.error(err_msg)
        return JsonResponse({'message': err_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@login_required
def check_task_status(request):
    """
    A view function to tell the client if the asynchronous add_tracking() task is done.
    Args:
        request: an ajax request to check for add tracking status
    Returns:
        JSON response to return result from asynchronous task add_tracking()
    """
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
            logger.error("Cannot get result for celery task id {}: {}".format(task_id, ex))
            return JsonResponse(ret_result,
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        ret_result['result'] = get_result
        return JsonResponse(ret_result,
                            status=status.HTTP_200_OK)
    else:
        return JsonResponse({"result": None},
                            status=status.HTTP_200_OK)


@login_required
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


@login_required
def get_score(request, exp_id, frame_no):
    seg_data = request.POST.dict()
    if 'region' not in seg_data:
        return JsonResponse({'message': 'region key not included in user edit segmentation data'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    try:
        reg_data = json.loads(seg_data['region'])
        img_file, err_msg = get_exp_image(exp_id, frame_no)
        if err_msg:
            return JsonResponse({'message': err_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        score, err_msg = get_edit_score(img_file, reg_data['vertices'])
        if err_msg:
            return JsonResponse({'message': err_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        u = request.user
        current_score = u.user_profile.score
        u.user_profile.score = score + current_score
        u.user_profile.save()
        return JsonResponse({'score': score}, status=status.HTTP_200_OK)
    except AttributeError as ex:
        return JsonResponse({'message': 'Scoring raised AttributeError'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as ex:
        logger.error("Cannot get score for a region in experiment {} frame {}: {}".format(exp_id, frame_no, ex))
        return JsonResponse({'message': 'Scoring raised exception. See server log for details'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
