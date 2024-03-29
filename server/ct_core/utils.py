import cv2
import time
import os
import shutil
import csv
import json
import errno
import datetime
import pytz
import numpy as np

from collections import OrderedDict

from irods.session import iRODSSession
from irods.exception import CollectionDoesNotExist
from irods.meta import iRODSMeta

from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist

from django_irods.storage import IrodsStorage
from django_irods.icommands import SessionException

from wand.image import Image

from ct_core.models import Segmentation, UserSegmentation, UserProfile, get_path, ExperimentInfo
from ct_core.task_utils  import get_exp_frame_no, validate_user, is_power_user, get_experiment_frame_seg_data


def is_exp_locked(exp_id):
    """
    Check if experiment is locked, and if yes, check whether lock needs to be released
    :param exp_id: experiment id
    :return: True and locked user if it is locked, False otherwise
    """
    lock_obj = Segmentation.objects.filter(exp_id=exp_id, locked_time__isnull=False).first()
    if lock_obj:
        # this experiment is locked, check whether lock release is needed
        elapsed_time = datetime.datetime.now(pytz.utc) - lock_obj.locked_time
        if elapsed_time.seconds >= settings.LOCK_TIMEOUT_SECONDS:
            # release the lock
            lock_obj.locked_time = None
            lock_obj.locked_user = None
            lock_obj.save()
            return False, None
        else:
            # experiment is locked
            return True, lock_obj.locked_user
    else:
        return False, None


def release_locks_by_user(u):
    if u and not u.is_anonymous:
        for item in Segmentation.objects.filter(locked_user=u):
            item.locked_time = None
            item.locked_user = None
            item.save()


def lock_experiment(exp_id, u):
    try:
        if u and not u.is_anonymous:
            # release lockes this user placed on other experiments before locking this experiment
            release_locks_by_user(u)
            # lock this experiment by this user
            entry = Segmentation.objects.get(exp_id=exp_id, frame_no=1)
            entry.locked_time = datetime.datetime.now(pytz.utc)
            entry.locked_user = u
            entry.save()
    except ObjectDoesNotExist:
        pass


def pack_zeros(input_str, string_len=settings.MAX_PRIORITY_STRING_LEN):
    return input_str.zfill(string_len)


def _get_experiment_name(col = None):
    if not col:
        return ''
    try:
        # str() is needed by python irods client metadata method
        key = str('experiment_name')
        col_md = col.metadata.get_one(key)
        return col_md.value
    except KeyError:
        return col.name


def _get_experiment_frame_no(session=None, col = None, exp_path=None):
    fno = -1
    if not col or not session or not exp_path:
        return fno
    key = str('frame_no')
    try:
        col_md = col.metadata.get_one(key)
        return int(col_md.value)
    except KeyError:
        ipath = exp_path + '/data/image/jpg'
        try:
            icoll = session.collections.get(ipath)
            image_names = [obj.name for obj in icoll.data_objects]
            fno = len(icoll.data_objects)
            if 'frame1.jpg' in image_names and 'color_frame1.jpg' in image_names:
                fno = fno // 2
            col.metadata.add(key, str(fno))
            return fno
        except CollectionDoesNotExist:
            return fno


def get_experiment_list_util(req_user=None):
    """
    Get all experiments from iRODS and return it as a list of dicts along with error message
    if any
    :param: req_user: requesting user, optional. If None or requesting user is not power user,
    no filtering of experiment list is needed. Otherwise, locked experiments need to be filtered out
    :return: experiment list and error message
    """
    istorage = IrodsStorage()
    exp_sorted_list = istorage.get_sorted_exp_list()
    exp_list = []
    locked_exp_list = []
    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        hpath = '/{}/home/{}'.format(settings.IRODS_ZONE, settings.IRODS_USER)
        if not exp_sorted_list:
            # the list is not sorted by priority yet, so sort it now
            coll = session.collections.get(hpath)
            index = len(coll.subcollections) - 1
            for col in coll.subcollections:
                exp_dict = {}
                exp_dict['id'] = col.name
                exp_dict['locked_by'] = ''
                exp_dict['name'] = _get_experiment_name(col)
                exp_dict['frames'] = _get_experiment_frame_no(session, col, hpath + '/' + col.name)
                if req_user:
                    exp_dict['start_frame'] = get_start_frame(req_user, col.name)
                coll, _ = _get_seg_coll(session, col.name)
                if coll:
                    exp_dict['has_segmentation'] = 'true'
                else:
                    exp_dict['has_segmentation'] = 'false'
                key = str('priority')
                def_pri = pack_zeros(str(index))
                col.metadata.add(key, def_pri)
                exp_list.append(exp_dict)
                index -= 1
        else:
            for exp_id in exp_sorted_list:
                exp_dict = {}
                exp_dict['id'] = exp_id
                exp_path = hpath + '/' + exp_id
                col = session.collections.get(exp_path)
                exp_dict['name'] = _get_experiment_name(col)
                coll, _ = _get_seg_coll(session, exp_id)
                if coll:
                    exp_dict['has_segmentation'] = 'true'
                else:
                    exp_dict['has_segmentation'] = 'false'
                exp_dict['frames'] = _get_experiment_frame_no(session, col, exp_path)
                if req_user:
                    exp_dict['start_frame'] = get_start_frame(req_user, exp_id)
                if req_user:
                    locked, l_user = is_exp_locked(exp_id)
                    if locked:
                        # experiment is locked
                        exp_dict['locked_by'] = l_user.username
                        locked_exp_list.append(exp_dict)
                    else:
                        exp_dict['locked_by'] = ''
                        exp_list.append(exp_dict)
                else:
                    exp_list.append(exp_dict)

            if locked_exp_list:
                exp_list.extend(locked_exp_list)

        return exp_list, ''
    return exp_list, 'Cannot connect to iRODS data server'


def get_exp_labels(exp_id):
    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        epath = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER + '/' + str(exp_id)
        try:
            coll = session.collections.get(epath)
            label_md_list = coll.metadata.get_all('label')
            label_list = []
            for lbl_md in label_md_list:
                label_list.append(lbl_md.value)
            return label_list
        except CollectionDoesNotExist:
            return ''


def read_video(filename):
    cap = cv2.VideoCapture(filename)
    success, frame = cap.read()
    while success:
        ret, image = cv2.imencode('.jpg', frame)
        jpeg = image.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n\r\n')
        success, frame = cap.read()
        time.sleep(settings.VIDEO_FRAME_INTERVAL_SECOND)


def extract_images_from_video_to_irods(exp_id='', video_input_file='', istorage=None):
    """
    extract images from video_input_file and put video file and extracted images to iRODS
    :param exp_id: experiment id
    :param video_input_file: video input file name string or UploadedTemporaryFile object on
    the Django server
    :param istorage: iRODS storage object with default being None
    :return: error message if error, 'success' otherwise
    """
    if not exp_id:
        return "input exp_id cannot be empty"
    if not video_input_file:
        return "input video_input_file cannot be empty"

    video_type = None

    if hasattr(video_input_file, 'name'):
        video_filename = video_input_file.name
        if video_filename.endswith('.avi'):
            video_type = 'avi'
        elif video_filename.endswith('.tif'):
            video_type = 'tif'
        video_file_path = video_input_file.temporary_file_path()
    else:
        if video_input_file.endswith('.avi'):
            video_type = 'avi'
        elif video_input_file.endswith('.tif'):
            video_type = 'tif'
        video_file_path = video_input_file
        video_filename = os.path.basename(video_input_file)

    if not video_type:
        return "uploaded video must be in the format of avi or tif"

    outf_path = '/tmp/{}/'.format(exp_id)

    if video_type == 'avi':
        cap = cv2.VideoCapture(video_file_path)
        success, frame = cap.read()
        count = 0
        while success:
            ofile = outf_path + "frame{}.jpg".format(count)
            # gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            # cv2.imwrite(ofile, gray)
            cv2.imwrite(ofile, frame)
            success, frame = cap.read()
            count += 1
    else:
        # video type is tif
        with Image(filename=video_file_path) as img:
            count = len(img.sequence)
            for i in range(0, count):
                ofile = outf_path + "frame{}.jpg".format(i)
                img_out = Image(image=img.sequence[i])
                img_out.format = 'jpeg'
                img_out.save(filename=ofile)

    try:
        if not istorage:
            istorage = IrodsStorage()

        irods_path = exp_id + '/data/video/' + video_filename

        # put video file to irods first
        istorage.save_file(video_file_path, irods_path, create_directory=True)

        irods_path = exp_id + '/data/image/jpg/'

        # create image collection first
        istorage.save_file('', irods_path, create_directory=True)

        # write to iRODS
        for i in range(count):
            ifile = outf_path + "frame{}.jpg".format(i)
            zero_cnt = len(str(count)) - len(str(i + 1))
            packstr = ''
            for j in range(0, zero_cnt):
                packstr += '0'
            ofile = 'frame' + packstr + str(i + 1) + '.jpg'
            istorage.save_file(ifile, irods_path + ofile)
            # clean up
            os.remove(ifile)
        # success
        return 'success'
    except SessionException as ex:
        shutil.rmtree(outf_path)
        return ex.stderr


def read_image_frame(exp_id, image_fname):
    ifile = os.path.join(settings.IRODS_ROOT, exp_id, 'image', image_fname)
    prop_dict = {}
    if os.path.isfile(ifile):
        img = cv2.imread(ifile, cv2.IMREAD_GRAYSCALE)
        rows, cols = img.shape
        prop_dict['width'] = cols
        prop_dict['height'] = rows
        k = []
        for i in range(rows):
            k_row = []
            for j in range(cols):
                k_row.append(img[i, j])
            k.append(k_row)
        prop_dict['intensity_values'] = k
    return prop_dict


def get_exp_image_size(exp_id):
    istorage = IrodsStorage()
    irods_img_path = os.path.join(exp_id, 'data', 'image', 'jpg')
    file_list = istorage.listdir(irods_img_path)[1]
    if len(file_list) > 0:
        img_name = file_list[0]
        image_path = os.path.join(settings.IRODS_ROOT, exp_id, 'image')
        if not os.path.exists(image_path):
            os.makedirs(image_path)
        ifile = os.path.join(image_path, img_name)
        if os.path.isfile(ifile):
            img = cv2.imread(ifile, cv2.IMREAD_GRAYSCALE)
            rows, cols = img.shape
            return rows, cols
        else:
            dest_path = istorage.get_one_image_frame(exp_id, 'jpg', img_name, image_path)
            ifile = os.path.join(dest_path, img_name)
            if os.path.isfile(ifile):
                img = cv2.imread(ifile, cv2.IMREAD_GRAYSCALE)
                rows, cols = img.shape
                return rows, cols
            else:
                return -1, -1


def get_exp_image(exp_id, frame_no, type='jpg', gray=True):
    """
    return the specified frame image in the specified experiment
    :param exp_id: experiment id
    :param frame_no: frame number that starts from 1
    :param type: jpg or png, with default being jpg
    :param gray: whether to always return the native grayscale image, with default being True
    :return: image file name, error message if any
    """
    image_path = os.path.join(settings.IRODS_ROOT, exp_id, 'image')
    # if os.path.exists(image_path):
    #    shutil.rmtree(image_path)
    try:
        if not os.path.exists(image_path):
            os.makedirs(image_path)
    except OSError:
        # path already exists
        pass
    fno = int(frame_no)
    istorage = IrodsStorage()
    irods_img_path = os.path.join(exp_id, 'data', 'image', type)
    file_list = istorage.listdir(irods_img_path)[1]
    flistlen = len(file_list)
    if flistlen <= 0:
        return None, "Requested experiment does not contain any image"
    if fno > flistlen:
        return None, 'Requested frame_no does not exist'

    # check whether image frame data in iRODS backend starts with 1 or 0
    if "frame0.jpg" in file_list and frame_no > 0:
        fno -= 1

    need_gray = gray
    if not need_gray:
        exp_info = ExperimentInfo.objects.filter(exp_id=exp_id).first()
        if exp_info:
            if exp_info.colormap == 'gray':
                need_gray = True
        else:
            need_gray = True
    if need_gray:
        prefix_str = 'frame'
    else:
        prefix_str = 'color_frame'
    img_name = prefix_str + str(fno) + '.jpg'
    if not img_name in file_list:
        if len(file_list) == 1:
            if fno == 1:
                img_name = file_list[0]
            else:
                return None, 'Requested frame_no does not exist'
        else:
            img1_name = file_list[0]
            if img1_name.startswith('frame'):
                start_idx = len('frame')
            else:
                start_idx = len('color_frame')
            seq_len = len(img1_name[start_idx:-4])
            if len(frame_no) > seq_len:
                return None, 'Requested frame_no does not exist'
            elif len(frame_no) == seq_len:
                img_name = prefix_str + frame_no + '.' + type
            else:
                # len(frame_no) < seq_len
                packstr = pack_zeros(frame_no, seq_len)
                img_name = prefix_str + packstr + '.' + type

    ifile = os.path.join(image_path, img_name)
    if os.path.isfile(ifile):
        return ifile, None
    else:
        dest_path = istorage.get_one_image_frame(exp_id, type, img_name, image_path)
        ifile = os.path.join(dest_path, img_name)
        if os.path.isfile(ifile):
            return ifile, None
        else:
            return None, 'Requested image frame does not exist'


def _get_seg_coll(session, exp_id):
    """
    internal method to return iRODS collection for segmentation data for experiment id
    :param session: iRODS session
    :param exp_id: experiment id
    :return: irods collection, irods collection path, which could be None if
    experiment does not have segmentation data
    """
    if not session or not exp_id:
        return None, None
    try:
        coll_path = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER + '/' \
                    + str(exp_id) + '/data/segmentation'
        coll = session.collections.get(coll_path)
        return coll, coll_path
    except CollectionDoesNotExist:
        return None, coll_path


def get_seg_collection(exp_id):
    """
    return iRODS collection for segmentation data for experiment id
    :param exp_id: experiment id
    :return: irods session, irods collection, irods collection path, which could be None if
    experiment does not have segmentation data
    """
    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        coll, coll_path = _get_seg_coll(session, exp_id)
        return session, coll, coll_path

    return None, None, None


def convert_csv_to_json(exp_id):
    """
    Convert segmentation csv data to json. If segmentation csv data does not exist, return empty
    list; otherwise, return json array that contains segmentation tracking data
    :param exp_id: experiment id
    :return: a list
    """
    resp_data = []
    session, coll, coll_path = get_seg_collection(exp_id)
    if coll:
        for obj in coll.data_objects:
            _, ext = os.path.splitext(obj.path)
            if ext != '.csv':
                continue

            logical_file = session.data_objects.get(obj.path)
            with logical_file.open('r') as f:
                contents = csv.reader(f)
                last_fno = -1
                obj_dict = {}
                frame_ary = []
                for row in contents:
                    if not row:
                        continue
                    if row[0].startswith('#'):
                        infostrs = row[0].split(' ')
                        for istr in infostrs:
                            istr.strip()
                            if istr.startswith('frame'):
                                curr_fno = int(istr[len('frame'):])
                                if obj_dict:
                                    frame_ary.append(obj_dict)
                                    obj_dict = {}
                                if frame_ary and last_fno < curr_fno:
                                    # starting a new frame
                                    resp_data.append(frame_ary)
                                    frame_ary = []
                                last_fno = curr_fno
                            elif istr.startswith('object'):
                                obj_dict['id'] = istr
                                obj_dict['frame'] = curr_fno + 1
                                obj_dict['vertices'] = []
                        continue

                    x = row[0].strip()
                    y = row[1].strip()
                    if 'id' in obj_dict:
                        obj_dict['vertices'].append([x, y])

                # add last obj_dict into resp_data
                if obj_dict:
                    frame_ary.append(obj_dict)
                    resp_data.append(frame_ary)
            break

    return resp_data


def sync_seg_data_to_db(eid):
    """
    Read segmentation data from iRODS and sync it to Django DB.
    :param eid: experiment id
    :return: True if link_id field is already in included in segmentation data, False if otherwise
    """
    session, coll, coll_path = get_seg_collection(eid)
    link_id_exist = False
    if coll:
        for obj in coll.data_objects:
            basename, ext = os.path.splitext(obj.name)
            if ext != '.json' or not basename.startswith('frame'):
                continue
            logical_file = session.data_objects.get(obj.path)
            with logical_file.open('r') as json_f:
                json_data = json.load(json_f)
                frame_no = int(basename[len('frame'):])
                if not link_id_exist and frame_no > 1:
                    for item in json_data:
                        if "link_id" in item:
                            link_id_exist = True
                            break
                idx = obj.path.find(eid)
                rel_path = obj.path[idx:]
                obj, created = Segmentation.objects.get_or_create(exp_id=eid,
                                                                  frame_no=frame_no,
                                                                  file=rel_path,
                                                                  defaults={'data': json_data})
                if not created:
                    # Segmentation object already exists, update it with new json data
                    obj.data = json_data
                    obj.save()
    return link_id_exist


def get_edited_frames(username, exp_id):
    try:
        user_edit_objs = UserSegmentation.objects.filter(
            user__username=username, exp_id=exp_id).order_by('frame_no')
        frm_list = []
        for obj in user_edit_objs:
            frm_list.append(str(obj.frame_no))
        return ', '.join(frm_list)
    except ObjectDoesNotExist:
        return ''


def get_frame_info(username, fno, exp_id):
    try:
        def_seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=fno)
    except ObjectDoesNotExist:
        return {}

    region_cnt = len(def_seg_obj.data)

    try:
        user_edit_objs = UserSegmentation.objects.get(user__username=username, exp_id=exp_id,
                                                      frame_no=fno)
        num_edited = user_edit_objs.num_edited
    except ObjectDoesNotExist:
        num_edited = 0

    return {
        'num_of_regions': region_cnt,
        'num_edited': num_edited
        }


def get_all_edit_users(exp_id):
    """
    return all users who have edit segmentation data for the experiment
    :param exp_id: experiment id
    :return: list of usernames
    """
    user_list = []
    user_username_list = []
    filter_objs = UserSegmentation.objects.filter(exp_id=exp_id)
    for obj in filter_objs:
        if obj.user.username not in user_username_list:
            user_username_list.append(obj.user.username)
            user_list.append({'username': obj.user.username,
                             'name': obj.user.get_full_name()})
    return user_list


def get_start_frame(user, exp_id):
    """
    check if user has saved edit segmentation to a certain frame, and if so, return the
    latest frame the user has worked on so that the user can pick up from where he left off
    :param user: requesting user
    :param exp_id: experiment id
    :return: start frame the user has saved segmentation data for the experiment,
    otherwise, return the first frame 1
    """
    filter_obj = UserSegmentation.objects.filter(user=user, exp_id=exp_id,
                                                 update_time__isnull=False)
    if filter_obj.exists():
        obj = filter_obj.latest('update_time')
        return obj.frame_no
    else:
        return 1


def save_user_seg_data_to_db(user, eid, fno, udata, num_edited):
    """
    Save user segmentation data for a specific experiment and frame to db
    :param user: requesting user
    :param eid: experiment id
    :param fno: frame no
    :param udata: serialized dict data in String format sent via request.POST
    :param num_edited: number of edited regions sent from client to be saved to DB
    :return: raise exception if any
    """

    json_data = json.loads(udata)
    int_fno = int(fno)
    curr_time = timezone.now()
    obj, created = UserSegmentation.objects.get_or_create(user=user,
                                                          exp_id=eid,
                                                          frame_no=int_fno,
                                                          defaults={'data': json_data,
                                                                    'num_edited': num_edited,
                                                                    'update_time': curr_time})

    rel_path = get_path(obj)
    if created:
        obj.file = rel_path
        obj.save()
    else:
        # UserSegmentation object already exists, update it with new json data
        obj.data = json_data
        obj.num_edited = num_edited
        obj.update_time = curr_time
        obj.save()

    # override system ground truth data for power users
    if is_power_user(user):
        sys_obj = Segmentation.objects.get(exp_id=eid, frame_no=int_fno)
        sys_obj.data = json_data
        sys_obj.save()

    return


def update_experiment_priority(exp_list):
    """
    Update experiment priority as iRODS metadata for corresponding experiments in the ordered list
    :param exp_list: the priority-sorted experiment list to update priority for
    :return: raise exception if failure
    """
    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        index = len(exp_list) - 1
        key = str('priority')
        for exp_id in exp_list:
            cpath = '/{}/home/{}/{}'.format(settings.IRODS_ZONE, settings.IRODS_USER, exp_id)
            col = session.collections.get(cpath)
            pstr = pack_zeros(str(index))
            try:
                col_md = col.metadata.get_one(key)
                col.metadata.remove(col_md.name, col_md.value, col_md.units)
                col.metadata.add(key, pstr)
            except KeyError:
                col.metadata.add(key, pstr)
            index -= 1


def compute_time_series_and_put_in_irods(exp_id, username=''):
    """
    compute average intensity for each cell and output time series data in csv format to iRODS for
    an experiment
    :param exp_id: experiment id
    :param username: Empty by default. If Empty, use system segmentation tracking data;
    otherwise, use user edit segmentation tracking data
    :return:
    """
    username = str(username)

    fno = get_exp_frame_no(exp_id)
    if fno < 0:
        # the experiment does not exist
        return "Experiment " + exp_id + " does not exist"
    if not validate_user(username):
        return username + " is not valid"

    min_f = 0
    max_f = fno

    image_path = os.path.join(settings.IRODS_ROOT, exp_id, 'image')
    if not os.path.exists(image_path):
        os.makedirs(image_path)

    c_row = ['Cell']
    sp_row = ['Species']
    f_row = ['Feature']
    cell_linked_data = []
    cids_linked_data = []
    cell_val_rows = []
    for i in range(min_f, max_f):
        row = [i]
        cids = []
        cell_id_dict = {}
        seg_obj = get_experiment_frame_seg_data(exp_id, i+1, username=username)
        ifile, err_msg = get_exp_image(exp_id, str(i+1))

        if err_msg:
            return err_msg

        img = cv2.imread(ifile, cv2.IMREAD_GRAYSCALE)
        rows, cols = img.shape

        cell_no = 1
        for region in seg_obj.data:
            vertices = region['vertices']
            # create numpy array from vertices
            ary_vertices = np.array(vertices)
            # vertices are normalized into [0, 1], need to restore to original coordinates
            ary_vertices = np.rint(np.multiply(ary_vertices, [cols, rows]))
            ypts = ary_vertices[:, 0]
            xpts = ary_vertices[:, 1]
            pts = np.vstack((xpts, ypts)).astype(np.int32).T
            mask = np.zeros_like(img)
            cv2.fillPoly(mask, [pts], 255)
            avg_int = cv2.mean(img, mask)[0]
            region['avg_intensity'] = avg_int
            cell_id_dict[region['id']] = {
                'value': avg_int,
                'link_id': region['link_id'] if 'link_id' in region else ''
            }
            if i == min_f:
                cids.append(region['id'])
                c_row.append('cell{}'.format(cell_no))
                sp_row.append('Species')
                f_row.append('Feature')
                row.append(avg_int)

            cell_no += 1

        if i > min_f:
            # use linked id data from last frame to derive order for the current frame
            idx = len(cell_linked_data) - 1
            last_frame_dict = cell_linked_data[idx]
            last_cids = cids_linked_data[idx]
            link_id_list = []
            for id in last_cids:
                link_id = last_frame_dict[id]['link_id']
                if link_id:
                    link_id_list.append(link_id)
                    cids.append(link_id)
                    row.append(cell_id_dict[link_id]['value'])
                else:
                    # this cell has ended the cycle - no linkage of the cell to next frame
                    cids.append('NaN')
                    row.append('NaN')
            # check whether there are new cells appearing from this frame
            cell_no = len(c_row) + 1
            for region in seg_obj.data:
                if region['id'] not in link_id_list:
                    # a new cell appeared in this frame
                    cids.append(region['id'])
                    c_row.append('cell{}'.format(cell_no))
                    sp_row.append('Species')
                    f_row.append('Feature')
                    row.append(region['avg_intensity'])
                    # append NaN to all previous rows to account for the new cell appearing
                    for r in cell_val_rows:
                        r.append('NaN')
                    cell_no += 1

        cell_linked_data.append(cell_id_dict)
        cids_linked_data.append(cids)
        cell_val_rows.append(row)

    output_file = 'time_series.csv'
    output_file_with_path = os.path.join(settings.IRODS_ROOT, exp_id, output_file)
    with open(output_file_with_path, 'w') as csvfile:
        fwriter = csv.writer(csvfile)
        md_start_row = []
        md_end_row = []
        cell_line_row = []
        name_row = []
        for cid in c_row:
            if cid == 'Cell':
                md_start_row.append('<begin metadata>')
                md_end_row.append('<end metadata>')
                cell_line_row.append('Cell Line')
                cell_line_row.append('CellLinePlaceHolder')
                name_row.append('Name')
                name_row.append('NamePlaceHolder')
            else:
                md_start_row.append('')
                md_end_row.append('')
                cell_line_row.append('')

        fwriter.writerow(md_start_row)
        fwriter.writerow(cell_line_row)
        fwriter.writerow(name_row)
        fwriter.writerow(md_end_row)
        fwriter.writerow(c_row)
        fwriter.writerow(sp_row)
        fwriter.writerow(f_row)
        for r in cell_val_rows:
            fwriter.writerow(r)

    # write csv file to iRODS
    istorage = IrodsStorage()
    irods_path = exp_id + '/data/segmentation/' + output_file
    istorage.save_file(output_file_with_path, irods_path, True)

    os.remove(output_file_with_path)


def put_image_list_to_irods(exp_id, files):
    """
    Put uploaded image list to iRODS
    :param exp_id: experiment id collection to save files to
    :param files: uploaded image frame list
    :return: success or error message
    """
    if not files:
        return "input files list cannot be empty"

    irods_path = exp_id + '/data/image/jpg/'
    istorage = IrodsStorage()

    # create image collection first
    istorage.save_file('', irods_path, create_directory=True)

    # write to iRODS
    for f in files:
        fname = f.name
        if not fname.endswith('.jpg'):
            return "input file must be jpg file"
        file_path = f.temporary_file_path()
    # success
    return 'success'


def delete_one_experiment(exp_id):
    """
    delete experiment identified by exp_id
    :param exp_id: experiment unique id
    :return: error message or 'success'
    """
    try:
        istorage = IrodsStorage()
        istorage.delete(exp_id)

        Segmentation.objects.filter(exp_id=exp_id).delete()
        UserSegmentation.objects.filter(exp_id=exp_id).delete()
        return 'success'
    except SessionException as ex:
        return ex.stderr
    except Exception as ex:
        return ex.message


def create_user_segmentation_data_for_download(exp_id, username):
    """
    Create a zipped user segmentation data for downloading. It contains user edit frames along
    with system default frames for frames the user has not editted to form a complete segmentation
    data set for an experiment
    :param exp_id: the experiment id for which the user has editted
    :param username: the edit user's username
    :return: the path of the zipped file being created
    """
    # verify exp_id and username are all valid
    if not validate_user(username):
        return None

    fno = get_exp_frame_no(exp_id)
    if fno <= 0:
        return None

    local_dir_path = os.path.join(settings.IRODS_ROOT, exp_id, 'download', username)
    if os.path.exists(local_dir_path):
        shutil.rmtree(local_dir_path)

    local_data_path = os.path.join(local_dir_path, 'edit_data')
    try:
        os.makedirs(local_data_path)
    except OSError as ex:
        # TODO: there might be concurrent operations.
        if ex.errno == errno.EEXIST:
            shutil.rmtree(local_data_path)
            os.makedirs(local_data_path)
        else:
            raise Exception(ex.message)

    min_f = 0
    max_f = fno
    for i in range(min_f, max_f):
        seg_obj = get_experiment_frame_seg_data(exp_id, i+1, username=username)
        filename = os.path.basename(seg_obj.file.name)
        out_file_name = os.path.join(local_data_path, filename)
        with open(out_file_name, 'w') as json_file:
            json.dump(seg_obj.data, json_file, indent=2)

    # create the zip file
    zip_filename_base = exp_id + '_' + username + '_edit_data'
    zip_with_path = os.path.join(local_dir_path, zip_filename_base)
    ret_filename = shutil.make_archive(zip_with_path, 'zip', local_data_path)
    shutil.rmtree(local_data_path)

    return ret_filename


def add_labels_to_exp(exp_coll, label_str):
    """
    Adding labels to iRODS AVU metadata for corresponding experiment collection
    :param exp_id: experiment id
    :param label_str: labels separated by semincolon
    :return:
    """
    if not label_str or not exp_coll:
        return
    label_list = label_str.split(';')
    for i, label in enumerate(label_list):
        label = label.strip()
        if i == 0:
            # need to erase all previously set existing AVU with 'label' attribute if any
            new_meta = iRODSMeta('label', label)
            exp_coll.metadata['label'] = new_meta
        else:
            exp_coll.metadata.add('label', label)


def add_colormap_to_exp(exp_id, colormap_str):
    """
    Adding colormap string to ExperimentInfo model for corresponding experiment collection
    :param exp_id: experiment id
    :param colormap_str: colormap string associated with the experiment
    :return:
    """
    if not colormap_str or not exp_id:
        return
    colormap_str = colormap_str.strip()
    obj, created = ExperimentInfo.objects.get_or_create(exp_id=exp_id, defaults={'colormap': colormap_str})
    if not created:
        # Segmentation object already exists, update it with new json data
        obj.colormap = colormap_str
        obj.save()


def create_seg_data_from_csv(exp_id, input_csv_file, irods_path):
    """
    Create frame json segmentation data from input csv file and put them in iRODS
    :param exp_id: experiment id
    :param input_csv_file: input csv file name
    :param irods_path: irods path to put frame json segmentation data
    :return: error message string or 'success' otherwise
    """
    rows, cols = get_exp_image_size(exp_id=exp_id)
    if rows == -1:
        return 'cannot get experiment image size'

    try:
        if hasattr(input_csv_file, 'name'):
            # TemporaryUploadedFile
            input_csv_path = input_csv_file.temporary_file_path()
        else:
            input_csv_path = input_csv_file

        with open(input_csv_path) as inf:
            outf_path = '/tmp/{}/'.format(exp_id)
            contents = csv.reader(inf)
            last_fno = -1
            obj_dict = {}
            frame_ary = []
            for row in contents:
                if not row:
                    continue
                if row[0].startswith('#'):
                    infostrs = row[0].split(' ')
                    for istr in infostrs:
                        istr.strip()
                        if istr.startswith('frame'):
                            curr_fno = int(istr[len('frame'):])
                            if obj_dict:
                                # remove the last vertex if it is duplicate with the first one
                                v1y, v1x = obj_dict['vertices'][0]
                                v2y, v2x = obj_dict['vertices'][-1]
                                tol = 0.0000001
                                if abs(v2y - v1y) < tol and abs(v2x - v1x) < tol:
                                    # two vertices are equal
                                    del obj_dict['vertices'][-1]

                                # filter out polygons with less than 3 vertices
                                if len(obj_dict['vertices']) > 2:
                                    frame_ary.append(obj_dict)
                                else:
                                    print('filtering out frame ' + str(last_fno) + ' object ' +
                                          obj_dict['id'])
                                obj_dict = {}
                            if frame_ary and last_fno < curr_fno:
                                # starting a new frame - write out frame csv file and put it to
                                # irods under the corresponding experiment id collection
                                ofilename = 'frame' + str(last_fno + 1) + '.json'
                                outf_name = outf_path + ofilename
                                with open(outf_name, 'w') as outf:
                                    outf.write(json.dumps(frame_ary, indent=2))
                                # put file to irods
                                with iRODSSession(host=settings.IRODS_HOST,
                                                  port=settings.IRODS_PORT,
                                                  user=settings.IRODS_USER,
                                                  password=settings.IRODS_PWD,
                                                  zone=settings.IRODS_ZONE,
                                                  ) as session:
                                    session.default_resource = settings.IRODS_RESC
                                    try:
                                        coll = session.collections.get(irods_path)
                                    except CollectionDoesNotExist:
                                        session.collections.create(irods_path)

                                    session.data_objects.put(outf_name,
                                                             irods_path + '/' + ofilename)

                                # clean up
                                os.remove(outf_name)

                                frame_ary = []
                            last_fno = curr_fno
                        elif istr.startswith('object'):
                            obj_dict['id'] = istr
                            obj_dict['vertices'] = []
                    continue

                x = row[0].strip()
                y = row[1].strip()
                numx = float(x) / rows
                numy = float(y) / cols
                if 'id' in obj_dict:
                    obj_dict['vertices'].append([numy, numx])

            # write the last frame
            if obj_dict:
                # filter out polygons with less than 3 vertices
                if len(obj_dict['vertices']) > 2:
                    frame_ary.append(obj_dict)
                else:
                    print('filtering out frame ' + str(curr_fno) + ' object ' +
                          obj_dict['id'])
                ofilename = 'frame' + str(last_fno + 1) + '.json'
                outf_name = outf_path + ofilename
                with open(outf_name, 'w') as outf:
                    outf.write(json.dumps(frame_ary, indent=2))
                # put file to irods
                with iRODSSession(host=settings.IRODS_HOST,
                                  port=settings.IRODS_PORT,
                                  user=settings.IRODS_USER,
                                  password=settings.IRODS_PWD,
                                  zone=settings.IRODS_ZONE) as session:
                    session.default_resource = settings.IRODS_RESC
                    try:
                        coll = session.collections.get(irods_path)
                    except CollectionDoesNotExist:
                        session.collections.create(irods_path)

                    session.data_objects.put(outf_name,
                                             irods_path + '/' + ofilename)

                # clean up
                os.remove(outf_name)
                # success
                return 'success'
    except Exception as ex:
        shutil.rmtree(outf_path)
        return ex.message


def get_users():
    pu_list = OrderedDict()
    ru_list = OrderedDict()
    for up in UserProfile.objects.order_by('user__username'):
        if up.role == UserProfile.POWERUSER:
            pu_list[up.user.username] = up.user.get_full_name()
        else:
            ru_list[up.user.username] = up.user.get_full_name()

    return pu_list, ru_list


def get_all_user_scores():
    u_list = OrderedDict()
    for up in UserProfile.objects.order_by('-score'):
        u_list[up.user.username] = up.score

    return u_list
