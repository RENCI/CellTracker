class CTTaskRouter(object):
    def route_for_task(self, task, args=None, kwargs=None):
        if task == 'ct_core.tasks.sync_user_seg_data_to_irods':
            return {
                'exchange': 'default',
                'exchange_type': 'topic',
                'routing_key': 'task.default',
            }
        return None
