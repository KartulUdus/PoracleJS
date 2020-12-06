FROM node:12-alpine

WORKDIR /usr/src/app
ADD . ./
# DEPS
ENV HUSKY_SKIP_INSTALL=1
RUN apk add --no-cache --virtual .gyp \
        python \
        make \
        g++ \
	git \
    && npm install \
    && apk del .gyp

EXPOSE 3030
CMD npm start
