import os
import json
import logging

from django.core.management.base import BaseCommand

from ct_core.utils import get_seg_collection


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    This script checks all segmentation frames in iRODS for invalid segmentation regions, in
    particular, segmentation polygon regions with less than 3 vertices.
    To run this command, do:
    docker exec -ti celltracker python manage.py check_for_invalid_segmentation_regions <exp_id>
    For example:
    docker exec -ti celltracker python manage.py check_for_invalid_segmentation_regions '18061934100'
    """
    help = "Check all segmentation frames for an experiment in iRODS for invalid regions with " \
           "less than 3 vertices"


    def add_arguments(self, parser):
        # experiment id to check against
        parser.add_argument('exp_id', help='experiment id')

    def handle(self, *args, **options):
        eid = options['exp_id']
        session, coll, coll_path = get_seg_collection(eid)
        if coll:
            for obj in coll.data_objects:
                basename, ext = os.path.splitext(obj.name)
                if ext != '.json':
                    continue
                logical_file = session.data_objects.get(obj.path)
                with logical_file.open('r') as json_f:
                    json_data = json.load(json_f)
                    for item in json_data:
                        v_array = item['vertices']
                        if len(v_array) < 3:
                            print len(v_array)
        return
