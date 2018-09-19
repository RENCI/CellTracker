import os
import csv
import json

from django.core.management.base import BaseCommand
from django.conf import settings

from irods.session import iRODSSession


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
        irods_path = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER + '/' + \
                     options['exp_id'] + '/data/segmentation'
        with open(options['input_file']) as inf:
            outf_path = '/tmp/'
            contents = csv.reader(inf)
            last_fno = -1
            obj_dict = {}
            frame_ary = []
            for row in contents:
                if not row:
                    continue
                if row[0].startswith('#'):
                    infostrs = row[0].split(' ')
                    for istr in infostrs:
                        istr.strip()
                        if istr.startswith('frame'):
                            curr_fno = int(istr[len('frame'):])
                            if obj_dict:
                                frame_ary.append(obj_dict)
                                obj_dict = {}
                            if frame_ary and last_fno < curr_fno:
                                # starting a new frame - write out frame csv file and put it to
                                # irods under the corresponding experiment id collection
                                ofilename = 'frame' + str(last_fno+1) + '.json'
                                outf_name = outf_path + ofilename
                                with open(outf_name, 'w') as outf:
                                    outf.write(json.dumps(frame_ary))
                                # put file to irods
                                with iRODSSession(host=settings.IRODS_HOST,
                                                  port=settings.IRODS_PORT,
                                                  user=settings.IRODS_USER,
                                                  password=settings.IRODS_PWD,
                                                  zone=settings.IRODS_ZONE) as session:
                                    session.data_objects.put(outf_name,
                                                             irods_path + '/' + ofilename)

                                # clean up
                                os.remove(outf_name)

                                frame_ary = []
                            last_fno = curr_fno
                        elif istr.startswith('object'):
                            obj_dict['id'] = istr
                            obj_dict['vertices'] = []
                    continue

                x = row[0].strip()
                y = row[1].strip()
                if 'id' in obj_dict:
                    obj_dict['vertices'].append([x, y])

            # write the last frame
            if obj_dict:
                frame_ary.append(obj_dict)
                ofilename = 'frame' + str(last_fno + 1) + '.json'
                outf_name = outf_path + ofilename
                with open(outf_name, 'w') as outf:
                    outf.write(json.dumps(frame_ary))
                # put file to irods
                with iRODSSession(host=settings.IRODS_HOST,
                                  port=settings.IRODS_PORT,
                                  user=settings.IRODS_USER,
                                  password=settings.IRODS_PWD,
                                  zone=settings.IRODS_ZONE) as session:
                    session.data_objects.put(outf_name,
                                             irods_path + '/' + ofilename)

                # clean up
                os.remove(outf_name)
