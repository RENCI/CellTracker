import logging
import cv2
import os

from wand.image import Image

from django.core.management.base import BaseCommand

from django_irods.storage import IrodsStorage


logger = logging.getLogger(__name__)


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
        outf_path = '/tmp/'
        if options['input_file'].endswith('.avi'):
            cap = cv2.VideoCapture(options['input_file'])
            success, frame = cap.read()
            count = 0
            while success:
                ofile = outf_path + "frame{}.jpg".format(count)
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                cv2.imwrite(ofile, gray)
                success, frame = cap.read()
                count += 1
        elif options['input_file'].endswith('.tif'):
            with Image(filename=options['input_file']) as img:
                count = len(img.sequence)
                for i in range(0, count):
                    ofile = outf_path + "frame{}.jpg".format(i)
                    img_out = Image(image=img.sequence[i])
                    img_out.format = 'jpeg'
                    img_out.save(filename=ofile)
        else:
            logger.info("Input video file must be in avi or tif format")
            return

        istorage = IrodsStorage()
        video_filename = os.path.basename(options['input_file'])
        irods_path = options['exp_id'] + '/data/video/' + video_filename

        # put video file to irods first
        istorage.saveFile(options['input_file'], irods_path, create_directory=True)

        irods_path = options['exp_id'] + '/data/image/jpg/'

        # create image collection first
        istorage.saveFile('', irods_path, create_directory=True)

        # write to iRODS
        for i in range(count):
            ifile = outf_path + "frame{}.jpg".format(i)
            zero_cnt = len(str(count)) - len(str(i+1))
            packstr = ''
            for j in range(0, zero_cnt):
                packstr += '0'
            ofile = 'frame' + packstr + str(i+1) + '.jpg'
            istorage.saveFile(ifile, irods_path + ofile)
            # clean up
            os.remove(ifile)
