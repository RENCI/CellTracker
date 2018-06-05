import cv2
import time
import os

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


def exact_images_from_video(videofile, imagepath):
    cap = cv2.VideoCapture(videofile)
    success, frame = cap.read()
    count = 0
    while success:
        ifile = os.path.join(imagepath, 'frame{}.jpg'.format(count))
        cv2.imwrite(ifile, frame)
        count += 1
        success, frame = cap.read()
    ifile = os.path.join(imagepath, 'frame0.jpg')
    return cv2.imread(ifile)
