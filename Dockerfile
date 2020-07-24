FROM node

# DEPS
RUN apt-get -y update && apt-get install -y curl gnupg2

# PoracleJS
WORKDIR PoracleJS
ADD . .
CMD npm start