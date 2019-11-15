# import torch is necessary in order to fix the import error
# also import order is important - import torch first, then skimage, then fastai

import torch

from skimage.io import imread
from skimage.draw import polygon

from fastai.vision import *
from fastai.utils.mem import *

from django.conf import settings

from ct_core.utils import get_exp_image


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
    r = np.array(row_list)
    c = np.array(col_list)
    rr, cc = polygon(r, c)
    img[rr, cc] = 255
    return img


def _create_mask_overlay_image(in_img_path, vert_arr):
    """
    Create a mask and overlay on the input image to return a single multi channel overlaid image
    :param in_img_path: file pointer that contains the input image
    :param vert_arr: array of vertices in the format of [[y, x], ...]
    :return: single multi-channel overlaid image
    """

    # Load images and split
    in_img = imread(in_img_path)
    r = in_img.shape[0]
    c = in_img.shape[1]

    # scale vertices back to image range
    for v in vert_arr:
        y = float(v[0]) * c
        x = float(v[1]) * r
        v[0] = y
        v[1] = x

    row_arr = [v[1] for v in vert_arr]
    col_arr = [v[0] for v in vert_arr]
    mask_img = _create_mask_image(r, c, row_arr, col_arr)
    img_list = [in_img, mask_img]
    overlay_img = torch.zeros((len(img_list), r, c))

    for i, img in enumerate(img_list):
        data = torch.from_numpy(img.astype(float)).div_(255.)
        overlay_img[i, :, :] = data
    return overlay_img


def get_edit_score(exp_id, frm_no, vert_list):
    """
    Get predicted score using the trained model
    :param exp_id: experiment id
    :param frm_no: image frame number
    :param vert_list: vertices list in the format of [[y, x],...] with y and x normalized within [0,1]
    :return: score, err_msg
    """
    ifile, err_msg = get_exp_image(exp_id, frm_no)
    if err_msg:
        return None, err_msg

    model_path = settings.SCORE_MODEL_PATH
    path, fname = os.path.split(model_path)
    learn = load_learner(path, fname)
    overlay_img = _create_mask_overlay_image(ifile, vert_list)
    prediction = learn.predict(overlay_img)
    score = int(np.round(float(prediction[2][0])*10,0))
    return score, None
