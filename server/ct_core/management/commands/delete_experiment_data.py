from django.core.management.base import BaseCommand
from django_irods.storage import IrodsStorage
from ct_core.models import Segmentation, UserSegmentation


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
            istorage = IrodsStorage()
            istorage.delete(exp_id)

            Segmentation.objects.filter(exp_id=exp_id).delete()
            UserSegmentation.objects.filter(exp_id=exp_id).delete()
            print ('Success')
