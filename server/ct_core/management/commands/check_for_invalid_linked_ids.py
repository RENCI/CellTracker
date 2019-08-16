from django.core.management.base import BaseCommand

from ct_core.models import Segmentation, UserSegmentation
from ct_core.utils import get_experiment_list_util, get_all_edit_users
from ct_core.task_utils  import get_exp_frame_no


class Command(BaseCommand):
    """
    This script checks potentially invalid link_id fields created by tracking algorithm for
     all experiments.
    To run this command, do:
    docker exec -ti celltracker python manage.py check_for_invalid_linked_ids
    """
    help = "Check potentially invalid link_id fields created by tracking algorithm for " \
           "all experiments"


    def handle(self, *args, **options):
        exp_to_be_excluded = ('18061934100_small', '18061934100', '16101015300',
                              '18061934100_test_avi', '18061934100_test_tif')
        exp_list, err_msg = get_experiment_list_util()
        for exp in exp_list:
            exp_id = exp['id']
            if exp_id in exp_to_be_excluded:
                continue
            # filter out experiments with no segmentation data
            if not Segmentation.objects.filter(exp_id=exp_id).exists():
                continue

            edit_users = get_all_edit_users(exp_id)

            fno = get_exp_frame_no(exp_id)
            min_f = 0
            max_f = fno
            # check system segmentation for all experiments
            ids = {}
            lids = {}
            for i in range(max_f, min_f, -1):
                id_list = []
                lid_list = []
                seg_obj = Segmentation.objects.get(exp_id=exp_id, frame_no=i)
                data = seg_obj.data
                for region in data:
                    id = region['id']
                    id_list.append(id)
                    if 'link_id' in region:
                        lid = region['link_id']
                        lid_list.append(lid)
                ids[i] = id_list
                lids[i] = lid_list

            for i, lid_lst in lids.iteritems():
                for lid in lid_lst:
                    if i-1 not in ids:
                        print('key error: i=' + str(i) + ', lid=' + str(lid) + ', exp_id=' + exp_id)
                    else:
                        if lid not in ids[i-1]:
                            print('link_id {} in frame {} for experiment {} does not link to a '
                                  'valid object id in its previous frame'.format(lid, i, exp_id))

            # check user segmentation data
            for u in edit_users:
                uids = {}
                ulids = {}
                for useg in UserSegmentation.objects.filter(exp_id=exp_id,
                                                            user__username=u['username']):
                    uid_list = []
                    ulid_list = []
                    ufno = useg.frame_no
                    for region in useg.data:
                        uid_list.append(region['id'])
                        if 'link_id' in region:
                            ulid_list.append(region['link_id'])
                    uids[ufno] = uid_list
                    ulids[ufno] = ulid_list
                for i, ulid_lst in ulids.iteritems():
                    for ulid in ulid_lst:
                        if i-1 in uids:
                            if ulid not in uids[i-1]:
                                print('user {} link_id {} in frame {} for experiment {} does not '
                                      'link to a valid object id in its previous user-editted '
                                      'frame {}'.format(u, lid, i, exp_id, i-1))
                        elif i-1 in ids:
                            if ulid not in ids[i-1]:
                                print('user {} link_id {} in frame {} for experiment {} does not '
                                      'link to a valid object id in its previous system '
                                      'frame {}'.format(u, lid, i, exp_id, i-1))
                        else:
                            print(
                            'key error: i=' + str(i) + ', ulid=' + str(ulid) +
                            ', exp_id=' + exp_id + ', user=' + u['username'])
        return
