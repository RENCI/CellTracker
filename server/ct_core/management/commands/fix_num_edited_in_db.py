from django.core.management.base import BaseCommand

from ct_core.models import UserSegmentation


class Command(BaseCommand):
    """
    This script fix num_edited saved in user segmentation table in database with old data. This
    num_edited was initially computed by client and passed to server when saving user segmentation
    data. Due to a bug in client code, initially saved num_edited in db may not be correct in
    old data after the bug is fixed. This command script can be run on an as-needed basis to ensure
    num_edited is correct.
    To run this command, do:
    docker exec -ti celltracker python manage.py fix_num_edited_in_db
    """
    help = "fix num_edited field in user segmentation table in db as needed"

    def handle(self, *args, **options):

        for exp in UserSegmentation.objects.all():
            data = exp.data
            edit_cnt = 0
            for region in data:
                if 'edited' in region:
                    edit_cnt += 1
            old_val = exp.num_edited
            if old_val != edit_cnt:
                exp.num_edited = edit_cnt
                exp.save()
                print('The old num_edited value {} is replaced with the new value {} for '
                      'experiment {} and user {}'.format(old_val, edit_cnt, exp.exp_id,
                                                         exp.user.username))
        return
