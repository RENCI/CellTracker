from __future__ import absolute_import

import logging
import os
import json
import shutil
import errno
import numpy as np

from django.conf import settings

from celery import shared_task

from django_irods.storage import IrodsStorage

from ct_core.models import UserSegmentation, Segmentation, get_path
from ct_core.task_utils  import get_exp_frame_no, find_centroid, distance_between_point_sets


logger = logging.getLogger('django')


@shared_task
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
            logger.debug(ex.message)
            return

    local_data_file = os.path.join(local_data_path, fname)
    with open(local_data_file, 'w') as json_file:
        json.dump(json_data, json_file, indent=2)

    istorage = IrodsStorage()
    istorage.saveFile(local_data_file, irods_path, True)

    shutil.rmtree(local_data_path)

    return


@shared_task
def add_tracking(exp_id, user='', frm_idx=None):
    """
    Add tracking to segmentation data for an experiment
    :param exp_id: experiment id
    :param user: empty by default. If empty, add tracking to system segmentation data; otherwise,
    add tracking to user edit segmentation data
    :param frm_idx: None by default. If None, add tracking to all frames; otherwise,
    add tracking to only the pass-in frm_idx which is zero-based frame index
    :return:
    """
    fno = get_exp_frame_no(exp_id)
    centroids_xy = {}
    ids = {}
    min_f = 0
    max_f = fno
    if frm_idx:
        min_f = frm_idx
        max_f = frm_idx + 2 if frm_idx < fno - 1 else fno

    for i in range(min_f, max_f):
        if user:
            seg_obj = UserSegmentation.objects.get(exp_id=exp_id, user=user, frame_no=i+1)
        else:
            seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=i+1)
        data = seg_obj.data
        centroid_list = []
        id_list = []
        for region in data:
            id = region['id']
            vertices = region['vertices']
            # create numpy array from vertices
            ary_vertices = np.array(vertices)
            x, y = find_centroid(ary_vertices)
            centroid_list.append([x, y])
            id_list.append(id)
        centroids_xy[i] = np.array(centroid_list)
        ids[i] = id_list

    # compute minimum distance from a centroid to all centroids in the next frame
    for fi in range(min_f, max_f-1):
        if user:
            seg_obj = UserSegmentation.objects.get(exp_id=exp_id, user=user, frame_no=fi+1)
        else:
            seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=fi+1)
        next_frm = fi + 1
        for cur_re in range(0, centroids_xy[fi].shape[0]):
            # xy1 contains centroid x, y for one region on frame fi
            xy1 = np.array([centroids_xy[fi][cur_re]])
            # xy2 contains all centroids for all regions on the next frame fj
            xy2 = centroids_xy[next_frm]
            min_idx = np.argmin(distance_between_point_sets(xy1, xy2))
            linked_id = ids[next_frm][min_idx]
            seg_obj.data[cur_re]['link_id'] = linked_id
        # update iRODS data to be in sync with updated data in DB
        rel_path = get_path(seg_obj)
        if user:
            sync_seg_data_to_irods(exp_id=exp_id, username=user.username, json_data=seg_obj.data,
                                   irods_path=rel_path)
        else:
            sync_seg_data_to_irods(exp_id=exp_id, json_data=seg_obj.data, irods_path=rel_path)
        seg_obj.save()

    return
