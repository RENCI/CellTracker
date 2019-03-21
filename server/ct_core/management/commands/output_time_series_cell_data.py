import logging

from django.core.management.base import BaseCommand

from ct_core.tasks import add_tracking


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    This script computes average intensity of each tracked cell on each frame and outputs a time
    series cell data file in csv format which can be imported into Cell Cycle Browser for
    visualization and analysis
    To run this command, do:
    docker exec -ti celltracker python manage.py output_time_series_cell_data <exp_id>
    For example:
    docker exec -ti celltracker python manage.py output_time_series_cell_data '18061934100'
    """
    help = "Compute average intensity of each cell and output time series cell data in csv format " \
           "for specified experiment"

    def add_arguments(self, parser):
        # experiment id
        parser.add_argument('exp_id', help='experiment id')

    def handle(self, *args, **options):
        if options['exp_id']:
            exp_id = str(options['exp_id'])
            add_tracking(exp_id)
