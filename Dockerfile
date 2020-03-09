FROM ubuntu:18.04

# DEPS
RUN apt-get -y update && apt-get install -y curl \
gnupg2 \
nodejs \
npm \
git

# PoracleJS
RUN git clone https://github.com/KartulUdus/PoracleJS.git --branch v4 && cd PoracleJS && npm install

WORKDIR PoracleJS

CMD npm start
