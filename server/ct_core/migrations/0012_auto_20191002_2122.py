# -*- coding: utf-8 -*-
# Generated by Django 1.11.18 on 2019-10-02 21:22
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('ct_core', '0011_auto_20190923_1412'),
    ]

    operations = [
        migrations.AddField(
            model_name='segmentation',
            name='locked_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='segmentation',
            name='locked_user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='locked_user', to=settings.AUTH_USER_MODEL),
        ),
    ]