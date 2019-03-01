FROM ubuntu:18.10

# CURL
RUN apt-get -y update && apt-get install -y curl

# gnupg2
RUN apt-get -y update && apt-get install -y gnupg2

# NodeJS
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash - && apt-get -y update && apt-get install -y nodejs

# Git
RUN apt-get -y update && apt-get install -y git

# PoracleJS
RUN git clone https://github.com/KartulUdus/PoracleJS.git --branch develop && cd PoracleJS && npm install


WORKDIR PoracleJS

CMD npm start
