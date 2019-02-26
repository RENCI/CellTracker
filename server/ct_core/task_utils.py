import numpy as np
from scipy.spatial import distance

import logging

from irods.session import iRODSSession

from django.conf import settings


frame_no_key = 'frame_no'
logger = logging.getLogger(__name__)


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
