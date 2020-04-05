FROM node

# DEPS
RUN apt-get -y update && apt-get install -y curl \
gnupg2 \
git

# PoracleJS
RUN git clone https://github.com/KartulUdus/PoracleJS.git && cd PoracleJS && npm install

WORKDIR PoracleJS

CMD npm start
