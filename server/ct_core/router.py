class CTTaskRouter(object):
    def route_for_task(self, task, args=None, kwargs=None):
        if task == 'ct_core.tasks.add_tracking':
            return {
                'exchange': 'default',
                'exchange_type': 'topic',
                'routing_key': 'task.default',
            }
        return None
