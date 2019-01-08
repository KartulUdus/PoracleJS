
FROM mariadb:latest as builder
RUN ["sed", "-i", "s/exec \"$@\"/echo \"not running $@\"/", "/usr/local/bin/docker-entrypoint.sh"]
# needed for intialization
ENV MYSQL_ROOT_PASSWORD=root
COPY test/base.sql /docker-entrypoint-initdb.d/
RUN ["/usr/local/bin/docker-entrypoint.sh", "mysqld", "--datadir", "/initialized-db", "--aria-log-dir-path", "/initialized-db"]
FROM mariadb:latest
COPY --from=builder /initialized-db /var/lib/mysql
FROM node:10
# install dependencies
WORKDIR /opt/app
COPY package.json ./
RUN npm cache clean --force && npm install
COPY . /opt/app
ENV PORT 3030
EXPOSE 3030

CMD [ "npm", "run", "start" ]