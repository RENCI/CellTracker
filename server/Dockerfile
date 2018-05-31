FROM renci/cell_tracker_docker_base
MAINTAINER Hong Yi <hongyi@renci.org>

RUN usermod -u 1000 docker
RUN groupmod -g 1000 docker

USER docker
WORKDIR /home/docker/celltracker

CMD ["/bin/bash"]
