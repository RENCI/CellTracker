# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator

# Create your models here.
class UserProfile(models.Model):
    user = models.OneToOneField(User, related_name='user')
    grade = models.PositiveSmallIntegerField(blank=True, null=True,
                                             validators=[MaxValueValidator(12),
                                                         MinValueValidator(1)])
    school = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return self.user.username
