# -*- coding: utf-8 -*-
import os
import json

from django.db import migrations

from ct_core.utils import get_experiment_list_util, get_seg_collection


def add_segmentation_from_irods(apps, schema_editor):
    '''
    We can't import the Segmentation model directly as it may be a newer
    version than this migration expects. We use the historical version.
    '''
    exp_list, err_msg = get_experiment_list_util()
    for exp in exp_list:
        exp_id = exp['id']
        Segmentation = apps.get_model('ct_core', 'Segmentation')
        if Segmentation.objects.filter(exp_id=exp_id).exists():
            continue
        session, coll, coll_path = get_seg_collection(exp_id)
        if coll:
            for obj in coll.data_objects:
                basename, ext = os.path.splitext(obj.name)
                if ext != '.json' or not basename.startswith('frame'):
                    continue
                logical_file = session.data_objects.get(obj.path)
                with logical_file.open('r') as json_f:
                    json_data = json.load(json_f)
                    frame_no = int(basename[len('frame'):])
                    idx = obj.path.find(exp_id)
                    rel_path = obj.path[idx:]
                    Segmentation.objects.create(exp_id=exp_id, frame_no=frame_no, file=rel_path,
                                                data=json_data)


class Migration(migrations.Migration):

    dependencies = [
        ('ct_core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_segmentation_from_irods)
    ]
