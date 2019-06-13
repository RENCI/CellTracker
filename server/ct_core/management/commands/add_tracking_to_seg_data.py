import logging

from django.core.management.base import BaseCommand

from ct_core.tasks import add_tracking
from ct_core.utils import get_all_edit_users


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    This script add tracking to segmentation data using a simple tracking algorithm in both Django
     DB and iRODS
    To run this command, do:
    docker exec -ti celltracker python manage.py add_tracking_to_seg_data <exp_id>
    For example:
    docker exec -ti celltracker python manage.py add_tracking_to_seg_data '18061934100'
    """
    help = "add tracking to system segmentation data for specified experiment in iRODS and database"

    def add_arguments(self, parser):
        # experiment id
        parser.add_argument('exp_id', help='experiment id')

    def handle(self, *args, **options):
        if options['exp_id']:
            exp_id = str(options['exp_id'])
            add_tracking(exp_id)
            edit_users = get_all_edit_users(exp_id)
            for u in edit_users:
                add_tracking(exp_id, username=u['username'])
