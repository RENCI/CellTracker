from django.core.management.base import BaseCommand
from django.conf import settings

from ct_core.utils import create_seg_data_from_csv


class Command(BaseCommand):
    """
    This script splits a whole csv file that contains all frames into individual csv file per frame
    and put individual csv file into iRODS under corresponding experiment
    To run this command, do:
    docker exec -ti celltracker python manage.py split_csv_into_irods <exp_id> <input_file_with_path>
    For example:
    docker exec -ti celltracker python manage.py split_csv_into_irods '18061934100' 'data/example_vertices.csv'
    """
    help = "Split a whole csv file into individual frame and put split csv frame files to iRODS " \
           "accordingly"


    def add_arguments(self, parser):
        # experiment id to put splitted csv file frames to
        parser.add_argument('exp_id', help='experiment id')

        # csv filename with full path to split from
        parser.add_argument('input_file', help='input csv file name with full path to be splitted')

    def handle(self, *args, **options):


        ret_msg = create_seg_data_from_csv(exp_id=options['exp_id'],
                                           input_csv_file=options['input_file'],
                                           irods_path=irods_path)
        print(ret_msg)
