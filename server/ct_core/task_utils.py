import os
import json
import shutil
import errno

import numpy as np
from scipy.spatial import distance

import logging

from irods.session import iRODSSession
from irods.exception import CollectionDoesNotExist

from django.conf import settings
from django.contrib.auth.models import User
from django_irods.storage import IrodsStorage
from django.core.exceptions import ObjectDoesNotExist

from ct_core.models import get_path_by_paras, UserProfile, Segmentation, UserSegmentation

frame_no_key = 'frame_no'
logger = logging.getLogger(__name__)


def is_power_user(u):
    if u and not u.is_superuser and u.is_authenticated():
        return True if u.user_profile.role == UserProfile.POWERUSER else False
    else:
        return False


def validate_user(username):
    """
    validate whether the username is a valid user or not
    :param username:
    :return: True for a valid user, False otherwise
    """
    try:
        u = User.objects.get(username=username)
        return True
    except ObjectDoesNotExist:
        return False


def get_exp_frame_no(exp_id):
    """
    get the total number of frames for an experiment; return -1 if requesting experiement
    does not exist
    :param exp_id: requesting experiment id
    :return: total number of frames for an experiment or -1 if the experiment does not exist
    """
    fno = -1
    with iRODSSession(host=settings.IRODS_HOST, port=settings.IRODS_PORT, user=settings.IRODS_USER,
                      password=settings.IRODS_PWD, zone=settings.IRODS_ZONE) as session:
        epath = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER + '/' + str(exp_id)
        try:
            coll = session.collections.get(epath)
        except CollectionDoesNotExist:
            return fno
        key = str(frame_no_key)
        try:
            col_md = coll.metadata.get_one(key)
            fno = int(col_md.value)
        except KeyError:
            ipath = epath + '/data/image/jpg'
            try:
                icoll = session.collections.get(ipath)
            except CollectionDoesNotExist:
                return fno
            fno = len(icoll.data_objects)
            coll.metadata.add(key, str(fno))

    return fno


def find_centroid(arr):
    """
    Find centroid of a 2D region passed in as a numpy array
    :param arr: numpy array specifying a region
    :return: centroid of the region
    """
    length = float(arr.shape[0])
    sum_x = np.sum(arr[:, 0])
    sum_y = np.sum(arr[:, 1])
    return sum_x/length, sum_y/length


def distance_between_point_sets(xy1, xy2):
    """
    return distance array between set of 2D points in xy1 and xy2
    :param xy1: 2D numpy array that contains first set of 2D points
    :param xy2: 2D numpy array that contains second set of 2D points
    :return:
    """
    return distance.cdist(xy1, xy2, 'euclidean')


def sync_seg_data_to_irods(exp_id='', username='', json_data={}, irods_path=''):
    """
    Sync system or user segmentation data from Database to iRODS
    :param self:
    :param exp_id: experiment id
    :param username: requesting username
    :param json_data: json dict data to be serealized to JSON format and saved to iRODS,
    :param irods_path: IRODS path to save the seralized JSON frame data
    :return: None with exceptions recorded in logs if failure
    """
    if not json_data or not irods_path or not username or not exp_id:
        # nothing to sync
        return

    if not irods_path.endswith('.json'):
        # nothing to sync
        return

    coll_path, fname = os.path.split(irods_path)
    local_data_path = os.path.join(settings.IRODS_ROOT, exp_id, 'data', username)
    try:
        os.makedirs(local_data_path)
    except OSError as ex:
        if ex.errno == errno.EEXIST:
            shutil.rmtree(local_data_path)
            os.makedirs(local_data_path)
        else:
            logger.error(ex.message)
            return

    local_data_file = os.path.join(local_data_path, fname)
    with open(local_data_file, 'w') as json_file:
        json.dump(json_data, json_file, indent=2)

    istorage = IrodsStorage()
    istorage.save_file(local_data_file, irods_path, True)

    if username:
        try:
            u = User.objects.get(username=username)
            if is_power_user(u):
                # backup old system data first before overriding it
                backup_fname = 'bak_{}'.format(fname)
                src_path = get_path_by_paras(exp_id, fname)
                tgt_path = get_path_by_paras(exp_id, backup_fname)
                istorage.copy_file(src_path, tgt_path)
                # override system ground truth data with user edit segmentation data
                istorage.save_file(local_data_file, src_path)
        except ObjectDoesNotExist:
            pass

    shutil.rmtree(local_data_path)
    return


def get_experiment_frame_seg_data(exp_id, frame_no, username=None):
    """
    get segmentation data for a specified frame in a specified experiment. If user is not None, user edit segmentation
    data will be returned if any; otherwise, ground truth segmentation data for the specified experiment will be
    returned
    :param exp_id: experiment id
    :param frame_no: frame number
    :param username: optional, user name to retrieve segmentation object for
    :return: segmentation data
    """
    if username:
        try:
            seg_obj = UserSegmentation.objects.get(exp_id=exp_id, user__username=username,
                                                   frame_no=frame_no)
        except ObjectDoesNotExist:
            try:
                # check system Segmentation if the next frame of user segmentation does not exist
                seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=frame_no)
            except ObjectDoesNotExist:
                seg_obj = None
    else:
        try:
            seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=frame_no)
        except ObjectDoesNotExist:
            seg_obj = None

    return seg_obj
