from django.core.management.base import BaseCommand

from ct_core.models import UserSegmentation
from django_irods.storage import IrodsStorage
from django_irods.icommands import SessionException


class Command(BaseCommand):
    """
    This script clean user edit segmentation data for debugging clean-up purpose in both Django
     DB and iRODS
    To run this command, do:
    docker exec -ti celltracker python manage.py clean_user_edit_seg_data <exp_id> <username>
    For example:
    docker exec -ti celltracker python manage.py clean_user_edit_seg_data '18061934100' 'hongyi'
    """
    help = "clean user edit segmentation data for debugging cleanup purpose for specified " \
           "experiment and user"

    def add_arguments(self, parser):
        # experiment id
        parser.add_argument('exp_id', help='experiment id')
        parser.add_argument('username', help='username')

    def handle(self, *args, **options):
        if options['exp_id'] and options['username']:
            exp_id = str(options['exp_id'])
            username = str(options['username'])
            filter_objs = UserSegmentation.objects.filter(exp_id=exp_id, user__username=username)
            # delete irods file if any
            istorage = IrodsStorage()
            for obj in filter_objs:
                try:
                    istorage.delete(str(obj.file))
                except SessionException as ex:
                    print ex.stderr
                    continue
            print filter_objs.delete()
