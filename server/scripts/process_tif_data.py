"""
This script should run after iinit is executed with irods_environment set up to use cell cycle 
iRODS account to put processed data into iRODS grid for TRACE tool to access
Functionality: process input experiment video in multi-page tif format to create input data for 
cell tracking game. Specifically, it removes colormap, extracts all frames in jpg format and
put them to iRODS.It also creates needed collections for the experiment collection in iRODS
To run this command, do:
python process_tif_data.py <exp_id> <input_file_with_path>
For example:
python process_tif_data.py '18061934100_test_tif' 'data/example_small.tif'
"""
import subprocess
import sys
import os

from wand.image import Image

def save_file_to_irods(from_name, to_name, create_directory=False):
    """
    :param
    from_name: the temporary file name in local disk to be uploaded from.
    to_name: the data object path in iRODS to be uploaded to
    create_directory: create directory as needed when set to True. Default is False
    Note if only directory needs to be created without saving a file, from_name should be empty
    and to_name should have "/" as the last character
    """
    if create_directory:
        splitstrs = to_name.rsplit('/', 1)
        proc = subprocess.Popen(['imkdir', '-p', splitstrs[0]], stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE)
        stdout, stderr = proc.communicate()
        if proc.returncode:
            raise Exception(proc.returncode,
                            'The directory ' + splitstrs[0] + ' failed to be created')

    if from_name and to_name:
        proc = subprocess.Popen(['iput', '-f', from_name, to_name], stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE)
        stdout, stderr = proc.communicate()
        if proc.returncode:
            raise Exception(proc.returncode, 'The file ' + from_name + ' failed to be put to iRODS')
    return


if len(sys.argv) != 3:
    print "Usage: process_data <experiment_id> <input_tif_file_full_path>"
    exit(1)
exp_id = sys.argv[1]
input_file = sys.argv[2]

if not input_file.endswith('tif'):
    print "input file must be a tif file"
    exit(1)

outf_path = '/tmp/'
with Image(filename=input_file) as img:
    count = len(img.sequence)
    for i in range(0, count):
        ofile = outf_path + "frame{}.jpg".format(i)
        img_out = Image(image=img.sequence[i])
        img_out.type = 'grayscale'
        img_out.format = 'jpeg'
        img_out.save(filename=ofile)

    video_filename = os.path.basename(input_file)
    irods_path = exp_id + '/data/video/' + video_filename

    # put video file to irods first
    save_file_to_irods(input_file, irods_path, create_directory=True)

    irods_path = exp_id + '/data/image/jpg/'

    # create image collection first
    save_file_to_irods('', irods_path, create_directory=True)

    # write to iRODS
    for i in range(count):
        ifile = outf_path + "frame{}.jpg".format(i)
        zero_cnt = len(str(count)) - len(str(i+1))
        packstr = ''
        for j in range(0, zero_cnt):
            packstr += '0'
        ofile = 'frame' + packstr + str(i+1) + '.jpg'
        save_file_to_irods(ifile, irods_path + ofile)
        # clean up
        os.remove(ifile)
