FROM node:lts

WORKDIR /usr/src/app
# DEPS
RUN apt-get -y update && apt-get install -y curl gnupg2

# PoracleJS
WORKDIR PoracleJS
ADD . .
RUN npm install
EXPOSE 3030
CMD npm start
