FROM python:2
MAINTAINER Hong Yi <hongyi@renci.org>

RUN apt-get update && apt-get install -y apt-transport-https
COPY . /tmp
RUN cp /tmp/docker.list /etc/apt/sources.list.d/ \
    && cp /tmp/requirements.txt /requirements.txt

RUN apt-get update && apt-get install --fix-missing -y --allow-unauthenticated \
    docker-engine \
    sudo \
    libjpeg62-turbo \
    libjpeg62-turbo-dev \
    binutils \
    build-essential \
    postgresql-9.6 \
    postgresql-client-9.6 \
    git \
    zip \
    rsync \
    wget \
    openssh-client \
    openssh-server \
&& rm -rf /var/lib/apt/lists/*

# Install SSH for remote PyCharm debugging
RUN mkdir /var/run/sshd
RUN echo 'root:docker' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

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
RUN pip install Django==1.11.18
RUN pip install numpy==1.11.1
RUN pip install -r requirements.txt

# install iRODS v4.2.4
RUN wget -qO - https://packages.irods.org/irods-signing-key.asc | apt-key add - \
    && echo "deb [arch=amd64] https://packages.irods.org/apt/ xenial main" \
    > /etc/apt/sources.list.d/renci-irods.list 
RUN apt-get update 
RUN apt-get install -y irods-runtime=4.2.4 irods-icommands=4.2.4

