#!/usr/bin/env bash

#This script should run after iinit is executed with irods_environment set up to use cell cycle 
#iRODS account to put processed data into iRODS grid for TRACE tool to access. It also uses 
#ImageMagick, so ImageMagick needs to be installed on the machine where it is run. The script 
# needs to run in the same directory where input data is located
#Functionality: process input experiment video in multi-page tif format to create input data for 
#cell tracking game. Specifically, it removes colormap, extracts all frames in jpg format and
#put them to iRODS.It also creates needed collections for the experiment collection in iRODS
#To run this command, do:
#sh process_tif_data.sh <exp_id> <input_file>
#For example:
#sh process_tif_data.sh '18061934100_test_tif' 'example_small.tif'

EXP_ID=$1
INPUT_FILE=$2

echo $EXP_ID
echo $INPUT_FILE
convert $INPUT_FILE -auto-level -depth 8 /tmp/frame%d.jpg

imkdir -p $EXP_ID/data/video
imkdir -p $EXP_ID/data/image/jpg
iput -f $INPUT_FILE $EXP_ID/data/video/$INPUT_FILE
iput -f /tmp/*.jpg $EXP_ID/data/image/jpg 

rm /tmp/*.jpg
