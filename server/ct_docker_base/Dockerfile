FROM python:2.7.11
MAINTAINER Hong Yi <hongyi@renci.org>

RUN apt-get update && apt-get install -y apt-transport-https
COPY docker.list /etc/apt/sources.list.d/

RUN apt-get update && apt-get install --fix-missing -y --force-yes \
    docker-engine \
    sudo \
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
    openssh-server \
&& rm -rf /var/lib/apt/lists/*

# Install SSH for remote PyCharm debugging
RUN mkdir /var/run/sshd
RUN echo 'root:docker' | chpasswd
RUN sed -i 's/PermitRootLogin without-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# SSH login fix. Otherwise user is kicked off after login
RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile

# Add docker user for use with SSH debugging
RUN useradd -d /home/docker -g docker docker \
    && echo 'docker:docker' | chpasswd

WORKDIR /usr/src/

# Install pip based packages (due to dependencies some packages need to come first)
RUN pip install --upgrade pip
RUN pip install Django==1.11.13
RUN pip install numpy==1.11.1
RUN pip install \
    arrow==0.7.0 \
    beautifulsoup4==4.4.1 \
    celery==4.1.1 \
    djangorestframework==3.8.2 \
    future==0.16.0 \
    gunicorn==19.8.1 \
    pandas==0.22.0 \
    Pillow==5.1.0 \
    psycopg2==2.6.1 \
    redis==2.10.6 \
    requests==2.18.4 \
    python-irodsclient \
    sh==1.12.14

