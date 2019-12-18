# import torch is necessary in order to fix the import error
# also import order is important - import torch first, then skimage, then fastai
# Note that this module must have a name of scoring_module to correspond to the pickled scoring model,
# otherwise an AttributeError will be raised when loading the pickled scording model using load_learner

import torch
from skimage.io import imread
from skimage.draw import polygon

from fastai.vision import *
from fastai.utils.mem import *

from django.conf import settings


class MultiChannelImageList(ImageList):
    # placeholder class for loading the trained model
    def open(self, fn):
        return []


def _create_mask_image(row, col, row_list, col_list):
    """
    Create the mask image out of polygon boundary for scoring
    :param row: number of rows for the mask image
    :param col: number of columns for the mask image
    :param row_list: list of row indices for polygon boundary
    :param col_list: list of column indices for polygon boundary
    :return: mask image with pixel value of 255 inside polygon boundary, and 0 outside the boundary
    """
    img = np.zeros((row, col), dtype=np.uint8)
    # make sure all image values are positive
    for i, item in enumerate(row_list):
        if item < 0:
            row_list[i] = 0

    for i, item in enumerate(col_list):
        if item < 0:
            col_list[i] = 0

    r = np.array(row_list)
    c = np.array(col_list)
    rr, cc = polygon(r, c)
    img[rr, cc] = 1
    return img


def _create_mask_overlay_image(in_img_path, vert_arr):
    """
    Create a mask and overlay on the input image to return a single multi channel overlaid image
    :param in_img_path: file pointer that contains the input image
    :param vert_arr: array of vertices in the format of [[y, x], ...]
    :return: single multi-channel overlaid image
    """

    # Load images and split
    in_img = imread(in_img_path, as_gray=True)
    r = in_img.shape[0]
    c = in_img.shape[1]

    # find center and scale vertices back to image range
    sum_x = 0.0
    sum_y = 0.0
    count = 0
    for v in vert_arr:
        y = float(v[0]) * c
        x = float(v[1]) * r
        v[0] = y
        v[1] = x
        sum_x += x
        sum_y += y
        count += 1

    center_x = int(sum_x /count + 0.5)
    center_y = int(sum_y / count + 0.5)
    dim_x = settings.SCORE_IMAGE_DIMENSION[0]
    dim_y = settings.SCORE_IMAGE_DIMENSION[1]
    half_size_x = dim_x / 2
    half_size_y = dim_y / 2

    row_arr = [v[1]-center_x + half_size_x for v in vert_arr]
    col_arr = [v[0]-center_y + half_size_y for v in vert_arr]

    mask_img = _create_mask_image(dim_x, dim_y, row_arr, col_arr)

    x_start = (int)(center_x - half_size_x) if center_x >= half_size_x else 0
    y_start = (int)(center_y - half_size_y) if center_y >= half_size_y else 0

    in_base_img = in_img[x_start:x_start + dim_x, y_start:y_start + dim_y]
    # make sure base image is normalized with grayscale value between 0 and 1
    max = np.amax(in_base_img)
    if max > 1:
        in_base_img = in_base_img/max

    img_list = [in_base_img, mask_img]

    img_count = len(img_list)
    overlay_img = torch.zeros((img_count, dim_x, dim_y))

    for i, img in enumerate(img_list):
        data = torch.from_numpy(img.astype(float))
        overlay_img[i, :, :] = data
    return Image(overlay_img)


def get_edit_score(ifile, vert_list):
    """
    Get predicted score using the trained model
    :param ifile: experiment base image to be scored on
    :param vert_list: vertices list in the format of [[y, x],...] with y and x normalized within [0,1]
    :return: score, err_msg
    """
    model_path = settings.SCORE_MODEL_PATH
    path, fname = os.path.split(model_path)
    learn = load_learner(path, fname)
    overlay_img = _create_mask_overlay_image(ifile, vert_list)
    prediction = learn.predict(overlay_img)
    score = int(np.round(float(prediction[2][0])*10,0))
    return score, None
