#!/bin/bash
# Collect static files to be served

echo "yes" | docker exec -i celltracker python manage.py collectstatic
