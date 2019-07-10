# -*- coding: utf-8 -*-
# Generated by Django 1.11.18 on 2019-07-10 20:15
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ct_core', '0008_usersegmentation_num_edited'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='email',
            field=models.EmailField(blank=True, default='', max_length=254, null=True, unique=True),
        ),
    ]
