from django.core.management.base import BaseCommand

from ct_core.models import UserSegmentation
from ct_core.utils import get_experiment_list_util
from django_irods.storage import IrodsStorage
from django_irods.icommands import SessionException


class Command(BaseCommand):
    """
    This script clean user edit segmentation data for debugging clean-up purpose in both Django
     DB and iRODS. If exp_id optional argument is being passed in, it only does clean-up for that
     experiment; otherwise, it cleans up for all experiments
    To run this command, do:
    docker exec -ti celltracker python manage.py clean_user_edit_seg_data --exp_id <exp_id> <username>
    or
    docker exec -ti celltracker python manage.py clean_user_edit_seg_data <username>
    For example:
    docker exec -ti celltracker python manage.py clean_user_edit_seg_data --exp_id '18061934100' 'hongyi'
    or
    docker exec -ti celltracker python manage.py clean_user_edit_seg_data 'hongyi'
    """
    help = "clean user edit segmentation data for debugging cleanup purpose for specified " \
           "experiment and user and frames"

    def add_arguments(self, parser):
        # experiment id
        parser.add_argument('--exp_id', default=None, help='experiment id')
        parser.add_argument('username', help='username')
        parser.add_argument('frame_no', help='frame number starting from 1')

    def handle(self, *args, **options):
        if options['username']:
            username = str(options['username'])
            del_objs = []
            if options['exp_id']:
                exp_id = str(options['exp_id'])
                if options['frame_no']:
                    fno = int(options['frame_no'])
                    filter_objs = UserSegmentation.objects.filter(exp_id=exp_id,
                                                                  user__username=username,
                                                                  frame_no=fno)
                else:
                    filter_objs = UserSegmentation.objects.filter(exp_id=exp_id,
                                                                  user__username=username)
                del_objs.append(filter_objs)
            else:
                exp_list, err_msg = get_experiment_list_util()
                for exp in exp_list:
                    exp_id = exp['id']
                    if options['frame_no']:
                        fno = int(options['frame_no'])
                        filter_objs = UserSegmentation.objects.filter(exp_id=exp_id,
                                                                      user__username=username,
                                                                      frame_no=fno)
                    else:
                        filter_objs = UserSegmentation.objects.filter(exp_id=exp_id,
                                                                      user__username=username)
                    del_objs.append(filter_objs)

            # delete irods file if any
            istorage = IrodsStorage()
            for objs in del_objs:
                for obj in objs:
                    try:
                        istorage.delete(str(obj.file))
                    except SessionException as ex:
                        print ex.stderr
                        continue
                if len(objs):
                    print objs.delete()
