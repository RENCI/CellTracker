import cv2
import time
import os
import shutil
import csv
import json
import errno
import numpy as np

from irods.session import iRODSSession
from irods.exception import CollectionDoesNotExist

from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist

from django_irods.storage import IrodsStorage

from ct_core.models import Segmentation, UserSegmentation, get_path
from ct_core.task_utils  import get_exp_frame_no, validate_user


def get_experiment_list_util():
    """
    Get all experiments from iRODS and return it as a list of dicts along with error message
    if any
    :return: experiment list and error message
    """
    exp_list = []
    err_msg = ''
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
        return exp_list, err_msg

    return exp_list, 'Cannot connect to iRODS data server'


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


def extract_images_from_video(videofile, imagepath):
    cap = cv2.VideoCapture(videofile)
    success, frame = cap.read()
    count = 0
    # clean up destination image path
    if os.path.exists(imagepath):
        shutil.rmtree(imagepath)

    os.mkdir(imagepath)

    while success:
        ifile = os.path.join(imagepath, 'frame{}.png'.format(count))
        cv2.imwrite(ifile, frame)
        count += 1
        success, frame = cap.read()

    if count > 0:
        return True
    else:
        return False


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
            dest_path = istorage.getOneImageFrame(exp_id, 'jpg', img_name, image_path)
            ifile = os.path.join(dest_path, img_name)
            if os.path.isfile(ifile):
                img = cv2.imread(ifile, cv2.IMREAD_GRAYSCALE)
                rows, cols = img.shape
                return rows, cols
            else:
                return -1, -1


def get_exp_image(exp_id, frame_no, type='jpg'):
    """
    return the specified frame image in the specified experiment
    :param exp_id: experiment id
    :param frame_no: frame number that starts from 1
    :param type: jpg or png, with default being jpg
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
    img_name = 'frame' + str(fno) + '.jpg'
    if not img_name in file_list:
        if len(file_list) == 1:
            if fno == 1:
                img_name = file_list[0]
            else:
                return None, 'Requested frame_no does not exist'
        else:
            img1_name = file_list[0]
            start_idx = len('frame')
            seq_len = len(img1_name[start_idx:-4])
            if len(frame_no) == seq_len:
                img_name = 'frame' + frame_no + '.' + type
            elif len(frame_no) > seq_len:
                return None, 'Requested frame_no does not exist'
            else:
                # len(frame_no) < seq_len
                zero_cnt = seq_len - len(frame_no)
                packstr = ''
                for i in range(0, zero_cnt):
                    packstr += '0'
                img_name = 'frame' + packstr + frame_no + '.' + type

    ifile = os.path.join(image_path, img_name)
    if os.path.isfile(ifile):
        return ifile, None
    else:
        dest_path = istorage.getOneImageFrame(exp_id, type, img_name, image_path)
        ifile = os.path.join(dest_path, img_name)
        if os.path.isfile(ifile):
            return ifile, None
        else:
            return None, 'Requested image frame does not exist'


def get_seg_collection(exp_id):
    """
    return iRODS collection for segmentation data for experiment id
    :param exp_id: experiment id
    :return: irods session, irods collection, irods collection path, which could be None if
    experiment does not have segmentation data
    """
    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        coll_path = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER + '/' \
                    + str(exp_id) + '/data/segmentation'
        try:
            coll = session.collections.get(coll_path)
            return session, coll, coll_path
        except CollectionDoesNotExist:
            return session, None, coll_path

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
    session, coll, coll_path = get_seg_collection(eid)
    if coll:
        for obj in coll.data_objects:
            basename, ext = os.path.splitext(obj.name)
            if ext != '.json':
                continue
            logical_file = session.data_objects.get(obj.path)
            with logical_file.open('r') as json_f:
                json_data = json.load(json_f)
                frame_no = int(basename[len('frame'):])
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
    curr_time = timezone.now()
    obj, created = UserSegmentation.objects.get_or_create(user= user,
                                                          exp_id=eid,
                                                          frame_no=int(fno),
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
    return


def compute_time_series_and_put_in_irods(exp_id, username=''):
    """
    compute average intensity for each cell and output time series data in csv format to iRODS for
    an experiment
    :param exp_id: experiment id
    :param username: Empty by default. If Empty, use system segmentation tracking data;
    otherwise, use user edit segmentation tracking data
    :return:
    """
    if isinstance(username, unicode):
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
        if username:
            try:
                seg_obj = UserSegmentation.objects.get(exp_id=exp_id, user__username=username,
                                                       frame_no=i+1)
            except ObjectDoesNotExist:
                # check system Segmentation if the next frame of user segmentation does not exist
                seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=i+1)
        else:
            seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=i+1)

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
    istorage.saveFile(output_file_with_path, irods_path, True)

    os.remove(output_file_with_path)


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
        try:
            seg_obj = UserSegmentation.objects.get(exp_id=exp_id, user__username=username,
                                                   frame_no=i + 1)
        except ObjectDoesNotExist:
            # check system Segmentation if the frame of user segmentation does not exist
            seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=i + 1)

        filename = os.path.basename(seg_obj.file.name)
        out_file_name = os.path.join(local_data_path, filename)
        with open(out_file_name, 'w') as json_file:
            json.dump(seg_obj.data, json_file, indent=2)

    # create the zip file
    zip_filename_base = username + '_edit_data'
    zip_with_path = os.path.join(local_dir_path, zip_filename_base)
    ret_filename = shutil.make_archive(zip_with_path, 'zip', local_data_path)
    shutil.rmtree(local_data_path)

    return ret_filename
