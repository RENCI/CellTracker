# -*- coding: utf-8 -*-

from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.core.validators import MinValueValidator, MaxValueValidator

from django_irods.storage import IrodsStorage


def get_path_by_paras(exp_id, filename, username=''):
    """
    Get iRODS path for segmentation data
    :param exp_id: experiment id
    :param filename: filename in the path
    :param username: optional, default is empty, in which case system ground truth segmentation path
    is returned; otherwise, a user segmentation path pertaining to the username is returned
    :return: iRODS path for a segmentation object
    """
    if username:
        return '{exp_id}/data/user_segmentation/{username}/{filename}'.format(
            exp_id=exp_id, username=username, filename=filename)
    else:
        return '{exp_id}/data/segmentation/{filename}'.format(
            exp_id=exp_id, filename=filename)


def get_path(instance, filename=''):
    """
    Get iRODS path for segmentation data. This is for handling file being uploaded from web
    client to server iRODS storage. Even though the user segmentation data is generated by
    server without being uploaded by users, we use FileField for potential future extensibility.

    :param instance: instance of Segmentation or UserSegmentation
    :param filename: file name to use. In our case, we don't use the default filename
    """
    user = getattr(instance, 'user', None)
    fname = 'frame{frm_no}.json'.format(frm_no=instance.frame_no)
    return get_path_by_paras(instance.exp_id, fname, user.username if user else '')


# Create your models here.
class UserProfile(models.Model):
    POWERUSER = 'PU'
    REGULARUSER = 'RU'
    USER_ROLE_CHOICES = (
        (POWERUSER, 'Power'),
        (REGULARUSER, 'Regular'),
    )

    user = models.OneToOneField(User, related_name='user_profile', on_delete=models.CASCADE)
    # cannot use email field in User model in order to guarantee uniqueness of emails at DB level
    email = models.EmailField(blank=True, null=True, unique=True)
    grade = models.PositiveIntegerField(blank=True, null=True, validators=[MaxValueValidator(12),
                                                                           MinValueValidator(1)])
    school = models.CharField(max_length=100, blank=True, null=True, default='')
    role = models.CharField(max_length=2, choices=USER_ROLE_CHOICES, default=REGULARUSER)

    score = models.IntegerField(blank=True, null=True, default=0)

    def __str__(self):
        return self.user.username


class Segmentation(models.Model):
    exp_id = models.CharField(max_length=50)
    frame_no = models.PositiveIntegerField()
    data = JSONField()
    file = models.FileField(upload_to=get_path, max_length=4096, null=True, blank=True,
                            storage=IrodsStorage())
    # this locked_time field is added for locking experiments by power users to avoid multiple
    # power users from updating ground truth data for the same experiment. It represents
    # the time when the experiment is locked by a power user. A value of null
    # means the experiment is not locked
    locked_time = models.DateTimeField(null=True, blank=True)
    locked_user = models.ForeignKey(User, null=True, blank=True, related_name='locked_user', on_delete=models.CASCADE)
    class Meta:
        unique_together = ("exp_id", "frame_no")

    def __unicode__(self):
        return 'Experiment {} frame {} segmentation'.format(self.exp_id,
                                                            self.frame_no)


class UserSegmentation(models.Model):
    user = models.ForeignKey(User, related_name='segmentation_user', on_delete=models.CASCADE)
    exp_id = models.CharField(max_length=50)
    frame_no = models.PositiveIntegerField()
    num_edited = models.IntegerField(default=0)
    data = JSONField()
    file = models.FileField(upload_to=get_path, max_length=4096, null=True, blank=True,
                            storage=IrodsStorage())
    update_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "exp_id", "frame_no")

    def __unicode__(self):
        return 'User {} experiment {} frame {} segmentation'.format(self.user.username,
                                                                    self.exp_id,
                                                                    self.frame_no)
