from django.core.management.base import BaseCommand
from ct_core.utils import delete_one_experiment


class Command(BaseCommand):
    """
    This script delete experiment data in the server database and in iRODS
    To run this command, do:
    docker exec -ti celltracker python manage.py delete_experiment_data <exp_id>
    For example:
    docker exec -ti celltracker python manage.py delete_experiment_data test
    """
    help = "delete experiment data in the server database and in iRODS"

    def add_arguments(self, parser):
        # experiment id
        parser.add_argument('exp_id', help='experiment id')

    def handle(self, *args, **options):
        if options['exp_id']:
            exp_id = str(options['exp_id'])
            ret_msg = delete_one_experiment(exp_id)
            print (ret_msg)
