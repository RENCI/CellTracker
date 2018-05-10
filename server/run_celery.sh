#!/bin/sh

cd /home/docker/celltracker
celery worker -A celltracker -E -Q default
