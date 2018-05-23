# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import os
import mimetypes

from django.template import loader
from django.conf import settings
from django.http import HttpResponse, FileResponse, HttpResponseServerError

from irods.session import iRODSSession


# Create your views here.
def index(request, session=''):
    import sys
    sys.path.append("/home/docker/pycharm-debug")
    import pydevd
    pydevd.settrace('152.54.9.92', port=21000, suspend=False)

    template = loader.get_template('ct_core/index.html')
    context = {
        'SITE_TITLE': settings.SITE_TITLE
    }
    return HttpResponse(template.render(context, request))


def stream_video(request, path):
    with iRODSSession(host=settings.IRODS_HOST,
                      port=settings.IRODS_PORT,
                      user=settings.IRODS_USER,
                      password=settings.IRODS_PWD,
                      zone=settings.IRODS_ZONE) as session:
        homepath = '/' + settings.IRODS_ZONE + '/home/' + settings.IRODS_USER
        fullpath = os.path.join(homepath, path)
        file_obj = session.data_objects.get(fullpath)

        mtype = 'application-x/octet-stream'
        mime_type = mimetypes.guess_type(path)
        if mime_type[0] is not None:
            mtype = mime_type[0]
        fobj = file_obj.open('r')

        response = FileResponse(fobj.read().decode(), content_type=mtype)
        response['Content-Disposition'] = 'attachment; filename="{name}"'.format(
            name=path.split('/')[-1])
        response['Content-Length'] = file_obj.size
        return response

    return HttpResponseServerError('iRODS server error')
