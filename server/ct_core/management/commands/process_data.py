from django.core.management.base import BaseCommand

from ct_core.utils import extract_images_from_video_to_irods


class Command(BaseCommand):
    """
    This script process input experiment video in avi format to create input data for cell tracking
    game. Specifically, it removes colormap from avi video, extracts all frames in jpg format and
    put them to iRODS.It also creates needed collections for the experiment collection in iRODS
    To run this command, do:
    docker exec -ti celltracker python manage.py process_data <exp_id> <input_file_with_path>
    For example:
    docker exec -ti celltracker python manage.py process_data '18061934100' 'data/example_small.avi'
    """
    help = "Process input experiment video data in avi format to create input data for the game"


    def add_arguments(self, parser):
        # experiment id to put splitted csv file frames to
        parser.add_argument('exp_id', help='experiment id')

        # csv filename with full path to split from
        parser.add_argument('input_file', help='input avi or tif file name with full path to be '
                                               'processed')

    def handle(self, *args, **options):
        ret_msg = extract_images_from_video_to_irods(exp_id=options['exp_id'],
                                                     video_input_file=options['input_file'])
        print(ret_msg)
