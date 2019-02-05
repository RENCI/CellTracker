from __future__ import absolute_import

import logging
import os
import json
import shutil
import errno

from django.conf import settings

from celery import shared_task

from django_irods.storage import IrodsStorage


logger = logging.getLogger('django')


@shared_task(bind=True)
def sync_user_seg_data_to_irods(self, exp_id='', username='', json_data={}, irods_path=''):
    """
    Sync user segmentation data from Database to iRODS
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
