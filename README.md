# TRacking and Analysis of CEll Cycle (TRACE) 

TRACE is an interactive web tool for tracking and segmenting cells from live-cell microscopy images. It was implemented using the [Docker](https://www.docker.com/) platform and [Django](https://www.djangoproject.com/) web framework on the server backend. It uses iRODS (https://irods.org/) for data storage and management and uses OpenCV (https://opencv.org/) for video frame extraction and management. 

## Install
This section is aimed for developers interested in working on the code. It provides guidance for setting up docker-based Django server local development environment for TRACE.

### Prerequisite
[Docker](https://www.docker.com/ "Docker") and [Docker Compose](https://docs.docker.com/compose/ "Docker Compose") need to be installed. On Windows 10 and above, native Docker may be installed and used. Otherwise, a Linux VM is needed.

### Steps to run TRACE Django web server in your local development environment
- git clone source code from this repo.
- Modify server/config/ct-config.yaml file to change ```CC_PATH``` to point to the root directory of the source tree for TRACE, and change ```HOST_USER_UID``` and ```HOST_USER_GID``` to correspond to the uid and gid of the user on the host who is running docker containers for TRACE.
- Copy local_settings.py from cellcycledev.renci.org and put it under the celltracker directory. This local_settings.py holds sensitive information, so should not be exposed to the outside world.
- From the root directory of the source tree, run ```./ctctl deploy_dev_nodb``` to build all containers.
- At this point you should be able to open up your browser to get to the TRACE page: http://localhost:8000, or http://192.168.56.101:8000/ from the host if host-only adaptor is set up in VirtualBox for the Linux VM running on a windows box.


### Useful docker-compose commands to manage docker containers 
- ```docker-compose up``` --- bring up all containers
- ```docker-compose stop``` --- shut down all containers
- ```docker-compose ps``` --- check status of all containers
- ```docker rm -fv $(docker ps -a -q)``` --- remove all containers
- ```docker rmi -f <image_id>``` where ```<image_id>``` is the image id output from ```docker images``` command which you want to remove. 

### Troubleshooting notes
- You may need to run ```docker-compose stop``` followed by ```docker-compose up``` when you run into issues when bringing up containers the first time. 
- To run ```./ctctl``` command again, you need to clean up existing containers and images by running ```docker rm -fv $(docker ps -a -q)``` to remove all containers and ```docker rmi -f <image_id>``` to remove images that need to be rebuilt.
   
## License 

TRACE is released under the [BSD 3-Clause License](https://tldrlegal.com/license/bsd-3-clause-license-(revised)). This means that you can do what you want, so long as you don't mess with the trademark, and as long as you keep the license with the source code.

©2018. This material is based upon work supported by a medical research grant from W. M. Keck Foundation. Any opinions, findings, conclusions, or recommendations expressed in this material are those of the authors and do not necessarily reflect the views of the foundation.
