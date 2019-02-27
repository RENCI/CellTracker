from __future__ import absolute_import

import logging
import numpy as np

from celery import shared_task

from ct_core.models import UserSegmentation, Segmentation, get_path
from ct_core.task_utils  import get_exp_frame_no, find_centroid, distance_between_point_sets, \
    sync_seg_data_to_irods


logger = logging.getLogger('django')


@shared_task(bind=True)
def add_tracking(self, exp_id, user=None, frm_idx=None):
    """
    Add tracking to segmentation data for an experiment
    :param exp_id: experiment id
    :param user: None by default. If None, add tracking to system segmentation data; otherwise,
    add tracking to user edit segmentation data
    :param frm_idx: None by default. If None, add tracking to all frames; otherwise,
    add tracking to only the pass-in frm_idx which is zero-based frame index
    :return:
    """
    fno = get_exp_frame_no(exp_id)
    logger.warning('fno: ' + str(fno))
    centroids_xy = {}
    ids = {}
    min_f = 0
    max_f = fno
    if frm_idx:
        min_f = frm_idx
        max_f = frm_idx + 2 if frm_idx < fno - 1 else fno
    logger.warning('min_f: ' + str(min_f) + ', max_f: ' + str(max_f))
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
        logger.warning(str(centroids_xy[i]))
        logger.warning(str(ids[i]))
    # compute minimum distance from a centroid to all centroids in the next frame
    for fi in range(min_f, max_f-1):
        if user:
            seg_obj = UserSegmentation.objects.get(exp_id=exp_id, user=user, frame_no=fi+1)
        else:
            seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=fi+1)
        next_frm = fi + 1
        logger.warning('fi: ' + str(fi) + ', next_frm:'+str(next_frm))
        for cur_re in range(0, centroids_xy[fi].shape[0]):
            # xy1 contains centroid x, y for one region on frame fi
            xy1 = np.array([centroids_xy[fi][cur_re]])
            # xy2 contains all centroids for all regions on the next frame fj
            xy2 = centroids_xy[next_frm]
            min_idx = np.argmin(distance_between_point_sets(xy1, xy2))
            logger.warning('min_idx' + str(min_idx))
            linked_id = ids[next_frm][min_idx]
            logger.warning('linked_id:' + str(linked_id))
            seg_obj.data[cur_re]['link_id'] = linked_id
        seg_obj.save()
        # update iRODS data to be in sync with updated data in DB
        rel_path = get_path(seg_obj)
        if user:
            logger.warning('before syncing to irods')
            sync_seg_data_to_irods(exp_id=exp_id, username=user.username, json_data=seg_obj.data,
                                   irods_path=rel_path)
        else:
            sync_seg_data_to_irods(exp_id=exp_id, username='system', json_data=seg_obj.data,
                                   irods_path=rel_path)

    return
