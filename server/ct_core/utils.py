import cv2
import time
import os
import shutil
import numpy as np

from django.conf import settings


def read_video(filename):
    cap = cv2.VideoCapture(filename)
    success, frame = cap.read()
    while success:
        ret, image = cv2.imencode('.jpg', frame)
        jpeg = image.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n\r\n')
        success, frame = cap.read()
        time.sleep(settings.VIDEO_FRAME_INTERVAL_SECOND)


def extract_images_from_video(videofile, imagepath):
    cap = cv2.VideoCapture(videofile)
    success, frame = cap.read()
    count = 0
    # clean up destination image path
    if os.path.exists(imagepath):
        shutil.rmtree(imagepath)

    os.mkdir(imagepath)

    while success:
        ifile = os.path.join(imagepath, 'frame{}.png'.format(count))
        cv2.imwrite(ifile, frame)
        count += 1
        success, frame = cap.read()

    if count > 0:
        return True
    else:
        return False


def read_image_frame(image_fname):
    ifile = os.path.join(settings.IRODS_ROOT, 'image', image_fname)
    prop_dict = {}
    if os.path.isfile(ifile):
        img = cv2.imread(ifile, cv2.IMREAD_GRAYSCALE)
        rows, cols = img.shape
        prop_dict['width'] = cols
        prop_dict['height'] = rows
        k = []
        for i in range(rows):
            k_row = []
            for j in range(cols):
                k_row.append(img[i, j])
            k.append(k_row)
        prop_dict['intensity_values'] = k
    return prop_dict