#!/usr/bin/env bash

CC_PATH=/home/cellcycle/CellTracker/server
BACKUP_PATH=/projects/cellcycle/trace_backup
echo "*** BACKUP DATABASE AND SETTINGS FILES ***"
docker exec celltracker /usr/bin/pg_dump -c -d postgres -U postgres -h db > "${CC_PATH}/pg.cc-`date +"%m-%d-%y"`.sql"
cd ${BACKUP_PATH}
# backup local_settings.py
cp -f ${CC_PATH}/celltracker/local_settings.py ./local_settings.py 
# backup ct-config.yaml
cp -f ${CC_PATH}/config/ct-config.yaml ./ct-config.yaml
# backup docker-compose.yml
cp -f ${CC_PATH}/docker-compose.yml ./docker-compose.yml
# backup database
cp -f ${CC_PATH}/pg.cc-`date +"%m-%d-%y"`.sql ./pg.cc-`date +"%m-%d-%y"`.sql
# remove the backup db from home directory
rm ${CC_PATH}/pg.cc-`date +"%m-%d-%y"`.sql
