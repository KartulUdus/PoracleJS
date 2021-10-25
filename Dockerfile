FROM node:16-alpine

WORKDIR /usr/src/app
ADD . ./
# DEPS
ENV HUSKY_SKIP_INSTALL=1
RUN apk add git \
    && apk add --no-cache --virtual .gyp \
        python3 \
        make \
        g++ \
    && npm install \
    && apk del .gyp
EXPOSE 3030
CMD npm start
