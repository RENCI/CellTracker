import logging

from django.core.management.base import BaseCommand

from ct_core.utils import get_experiment_list_util, sync_seg_data_to_db


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    This script sychronize segmentation data from iRODS to database as needed, e.g., files in iRODS
    are changed and the old segmentation data in db needs to be refreshed from iRODS
    To run this command, do:
    docker exec -ti celltracker python manage.py sync_seg_data_from_irods_to_db <exp_id>
    or
    docker exec -ti celltracker python manage.py sync_seg_data_from_irods_to_db
    For example:
    docker exec -ti celltracker python manage.py sync_seg_data_from_irods_to_db --exp_id '18061934100'
    """
    help = "sychronize segmentation data for specified experiment from iRODS to database"

    def add_arguments(self, parser):
        # optional experiment id
        parser.add_argument('--exp_id', default=None, help='experiment id')

    def handle(self, *args, **options):
        if options['exp_id']:
            exp_id = str(options['exp_id'])
            sync_seg_data_to_db(exp_id)
            logger.debug('Synced db from irods for only one experiment {}'.format(exp_id))
        else:
            exp_list, err_msg = get_experiment_list_util()
            for exp in exp_list:
                exp_id = exp['id']
                sync_seg_data_to_db(exp_id)
                logger.debug('Synced db from irods for one experiment {}'.format(exp_id))
