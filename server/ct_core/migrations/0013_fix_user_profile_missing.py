# -*- coding: utf-8 -*-
# Generated by Django 1.11.13 on 2018-12-18 17:09
from __future__ import unicode_literals

from django.db import migrations
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from ct_core.models import UserProfile


def fix_missing_user_profile(apps, schema_editor):
    for u in User.objects.all().filter(is_staff=False, is_superuser=False, is_active=True):
        try:
            up = u.user_profile
        except ObjectDoesNotExist:
            up = UserProfile(user=u)
            up.save()


class Migration(migrations.Migration):

    dependencies = [
        ('ct_core', '0012_auto_20191002_2122'),
    ]

    operations = [
        migrations.RunPython(fix_missing_user_profile)
    ]
