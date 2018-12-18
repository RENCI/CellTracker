# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.contrib.postgres.fields import JSONField

from django_irods.storage import IrodsStorage


def get_path(instance, filename):
    """
    Get iRODS path for segmentation data.
    :param instance: instance of Segmentation or UserSegmentation
    :param filename: file name to use. In our case, we don't use the default filename
    """
    user = getattr(instance, 'user', None)
    if user:
        return '{exp_id}/data/user_segmentation/{username}/frame{frm_no}.json'.format(
            exp_id=instance.exp_id, username=user.username, frm_no=instance.frame_no)
    else:
        return '{exp_id}/data/segmentation/frame{frm_no}.json'.format(
            exp_id=instance.exp_id, frm_no=instance.frame_no)


# Create your models here.
class UserProfile(models.Model):
    user = models.OneToOneField(User, related_name='user')
    grade = models.PositiveSmallIntegerField(blank=True, null=True,
                                             validators=[MaxValueValidator(12),
                                                         MinValueValidator(1)])
    school = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return self.user.username


class Segmentation(models.Model):
    exp_id = models.CharField(max_length=50)
    frame_no = models.PositiveIntegerField()
    data = JSONField()
    file = models.FileField(upload_to=get_path, max_length=4096, null=True, blank=True,
                            storage=IrodsStorage())
    def __str__(self):
        return 'Experiment {} frame {} segmentation'.format(self.exp_id,
                                                            self.frame_no)


class UserSegmentation(models.Model):
    user = models.OneToOneField(User, related_name='segmentation_user')
    exp_id = models.CharField(max_length=50)
    frame_no = models.PositiveIntegerField()
    data = JSONField()
    file = models.FileField(upload_to=get_path, max_length=4096, null=True, blank=True,
                            storage=IrodsStorage())

    def __str__(self):
        return 'User {} experiment {} frame {} segmentation'.format(self.user.username,
                                                                    self.exp_id,
                                                                    self.frame_no)
