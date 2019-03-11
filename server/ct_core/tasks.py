from __future__ import absolute_import

import logging
import numpy as np

from celery import shared_task

from django.core.exceptions import ObjectDoesNotExist

from ct_core.models import UserSegmentation, Segmentation, get_path
from ct_core.task_utils  import get_exp_frame_no, find_centroid, distance_between_point_sets, \
    sync_seg_data_to_irods


logger = logging.getLogger('django')


@shared_task
def add_tracking(exp_id, username='', frm_idx=-1):
    """
    Add tracking to segmentation data for an experiment
    :param exp_id: experiment id
    :param user: Empty by default. If not Empty, add tracking to system segmentation data;
    otherwise, add tracking to user edit segmentation data
    :param frm_idx: -1 by default. If -1, add tracking to all frames; otherwise,
    add tracking to only the pass-in frm_idx which is zero-based frame index
    :return:
    """
    if isinstance(username, unicode):
        username = str(username)
    if isinstance(frm_idx, unicode):
        frm_idx = int(frm_idx)

    fno = get_exp_frame_no(exp_id)
    centroids_xy = {}
    ids = {}
    ret_result = []
    min_f = 0
    max_f = fno
    if frm_idx >= 0:
        min_f = frm_idx - 1 if frm_idx > 0 else frm_idx
        max_f = frm_idx + 2 if frm_idx < fno - 1 else fno

    for i in range(min_f, max_f):
        if username:
            try:
                seg_obj = UserSegmentation.objects.get(exp_id=exp_id, user__username=username,
                                                       frame_no=i+1)
            except ObjectDoesNotExist:
                # check system Segmentation if the next frame of user segmentation does not exist
                seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=i+1)
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
        if username:
            try:
                seg_obj = UserSegmentation.objects.get(exp_id=exp_id, user__username=username,
                                                       frame_no=fi+1)
            except ObjectDoesNotExist:
                # check system Segmentation if the next frame of user segmentation does not exist
                seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=fi+1)
        else:
            seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=fi+1)
        if frm_idx >= 0:
            return_regions = []
        next_frm = fi + 1
        for cur_re in range(0, centroids_xy[fi].shape[0]):
            # xy1 contains centroid x, y for one region on frame fi
            xy1 = np.array([centroids_xy[fi][cur_re]])
            # xy2 contains all centroids for all regions on the next frame fj
            xy2 = centroids_xy[next_frm]
            min_idx = np.argmin(distance_between_point_sets(xy1, xy2))
            linked_id = ids[next_frm][min_idx]
            seg_obj.data[cur_re]['link_id'] = linked_id
            if frm_idx >= 0:
                return_regions.append({'id': ids[fi][cur_re],
                                       'linked_id': linked_id})
        seg_obj.save()
        if frm_idx >= 0:
            ret_result.append({'frame_no': fi+1,
                               'region_ids': return_regions})
        # update iRODS data to be in sync with updated data in DB
        rel_path = get_path(seg_obj)
        if username:
            sync_seg_data_to_irods(exp_id=exp_id, username=username, json_data=seg_obj.data,
                                   irods_path=rel_path)
        else:
            sync_seg_data_to_irods(exp_id=exp_id, username='system', json_data=seg_obj.data,
                                   irods_path=rel_path)

    return ret_result
