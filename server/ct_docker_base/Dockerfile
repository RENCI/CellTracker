FROM python:3.6-jessie
MAINTAINER Hong Yi <hongyi@renci.org>

ENV DEBIAN_FRONTEND noninteractive

RUN printf "deb http://archive.debian.org/debian/ jessie main\ndeb http://security.debian.org jessie/updates main" > /etc/apt/sources.list

RUN apt-get update && apt-get install -y \
    apt-utils \
    apt-transport-https \
    ca-certificates \
    sudo \
    && apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D

COPY . /tmp
RUN cp /tmp/docker.list /etc/apt/sources.list.d/ \
    && cp /tmp/requirements.txt /requirements.txt

RUN apt-get update && apt-get install --fix-missing -y --allow-unauthenticated --no-install-recommends \
    docker-engine \
    libjpeg62-turbo \
    libjpeg62-turbo-dev \
    binutils \
    build-essential \
    postgresql-9.4 \
    postgresql-client-9.4 \
    git \
    zip \
    rsync \
    wget \
    openssh-client \
    openssh-server 

# Install SSH for remote PyCharm debugging
RUN mkdir /var/run/sshd
RUN echo 'root:docker' | chpasswd
RUN sed -i 's/#PermitRootLogin without-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# SSH login fix. Otherwise user is kicked off after login
RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile

# Add docker user for use with SSH debugging
RUN useradd -d /home/docker -g docker docker \
    && echo 'docker:docker' | chpasswd

WORKDIR /

# Install pip based packages (due to dependencies some packages need to come first)
RUN pip install --upgrade pip
RUN pip install numpy==1.16.0
RUN pip install -r requirements.txt

# install iRODS
RUN wget -qO - https://packages.irods.org/irods-signing-key.asc | apt-key add - \
    && echo "deb [arch=amd64] https://packages.irods.org/apt/ trusty main" \
    > /etc/apt/sources.list.d/renci-irods.list 
RUN apt-get update 
RUN apt-get install -y irods-runtime irods-icommands

ENV DEBIAN_FRONTEND teletype

# Cleanup
RUN apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

