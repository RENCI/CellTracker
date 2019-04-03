import shutil
import os

from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    """
    This script clean cached data on the server if cached data got stale for specified experiment
    To run this command, do:
    docker exec -ti celltracker python manage.py clean_cached_data <exp_id>
    For example:
    docker exec -ti celltracker python manage.py clean_cached_data '18061934100'
    """
    help = "clean cached data on the server if cached data got stale for specified " \
           "experiment"

    def add_arguments(self, parser):
        # experiment id
        parser.add_argument('exp_id', help='experiment id')

    def handle(self, *args, **options):
        if options['exp_id']:
            exp_id = str(options['exp_id'])
            input_dest_path = os.path.join(settings.IRODS_ROOT, exp_id)
            if os.path.exists(input_dest_path):
                shutil.rmtree(input_dest_path)
