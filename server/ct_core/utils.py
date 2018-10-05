import cv2
import time
import os
import shutil
import csv

from irods.session import iRODSSession
from irods.exception import CollectionDoesNotExist

from django.conf import settings

from django_irods.storage import IrodsStorage


frame_no_key = 'frame_no'


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


def get_exp_frame_no(exp_id):
    fno = -1
    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        epath = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER + '/' + str(exp_id)
        coll = session.collections.get(epath)
        key = str(frame_no_key)
        try:
            col_md = coll.metadata.get_one(key)
            fno = int(col_md.value)
        except KeyError:
            ipath = epath + '/data/image/jpg'
            icoll = session.collections.get(ipath)
            fno = len(icoll.data_objects)
            coll.metadata.add(key, str(fno))

    return fno


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
    converted = False
    session, coll, coll_path = get_seg_collection(exp_id)
    if coll:
        for obj in coll.data_objects:
            if converted:
                break
            _, ext = os.path.splitext(obj.path)
            if ext != '.csv':
                continue

            logical_file = session.data_objects.get(coll_path + '/' + obj.name)
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
                converted = True
            break

    return resp_data
