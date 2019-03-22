import cv2
import time
import os
import shutil
import csv
import json
import numpy as np

from irods.session import iRODSSession
from irods.exception import CollectionDoesNotExist

from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist

from django_irods.storage import IrodsStorage

from ct_core.models import Segmentation, UserSegmentation, get_path
from ct_core.task_utils  import get_exp_frame_no


frame_no_key = 'frame_no'


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


def get_start_frame(user):
    """
    check if user has saved edit segmentation to a certain frame, and if so, return the
    latest frame the user has worked on so that the user can pick up from where he left off
    :param user: requesting user
    :return: start frame the user has saved segmentation data, otherwise, return the first frame 1
    """
    filter_obj = UserSegmentation.objects.filter(user=user, update_time__isnull=False)
    if filter_obj.exists():
        obj = filter_obj.latest('update_time')
        return obj.frame_no
    else:
        return 1


def save_user_seg_data_to_db(user, eid, fno, json_data):
    """
    Save user segmentation data for a specific experiment and frame to db
    :param user: requesting user
    :param eid: experiment id
    :param fno: frame no
    :param json_data: serialized dict data in String format sent via request.POST
    :return: raise exception if any
    """

    udata = json.loads(json_data)
    curr_time = timezone.now()
    obj, created = UserSegmentation.objects.get_or_create(user= user,
                                                          exp_id=eid,
                                                          frame_no=int(fno),
                                                          defaults={'data': udata,
                                                                    'update_time': curr_time})

    rel_path = get_path(obj)
    if created:
        obj.file = rel_path
        obj.save()
    else:
        # UserSegmentation object already exists, update it with new json data
        obj.data = json_data
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
    min_f = 0
    max_f = fno

    image_path = os.path.join(settings.IRODS_ROOT, exp_id, 'image')
    if not os.path.exists(image_path):
        os.makedirs(image_path)

    cid_row = ['CellID']
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
                cid_row.append(region['id'])
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
            for id in last_cids:
                link_id = last_frame_dict[id]['link_id']
                cids.append(link_id)
                row.append(cell_id_dict[link_id]['value'])

        cell_linked_data.append(cell_id_dict)
        cids_linked_data.append(cids)
        cell_val_rows.append(row)

    output_file = 'time_series.csv'
    output_file_with_path = os.path.join(settings.IRODS_ROOT, exp_id, output_file)
    with open(output_file_with_path, 'w') as csvfile:
        fwriter = csv.writer(csvfile)
        fwriter.writerow(cid_row)
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
