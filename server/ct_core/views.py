# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from django.template import loader
from django.conf import settings
from django.http import HttpResponse


# Create your views here.
def index(request, session=''):
    #import sys
    #sys.path.append("/home/docker/pycharm-debug")
    #import pydevd
    #pydevd.settrace('172.17.0.1', port=21000, suspend=False)


    template = loader.get_template('ct_core/index.html')
    context = {
        'SITE_TITLE': settings.SITE_TITLE
    }
    return HttpResponse(template.render(context, request))


def stream_video(request, path):
    return HttpResponse("requested streaming path is " + path)

