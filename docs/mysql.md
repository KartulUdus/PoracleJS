# Database

Poracle stores a record or users and their trackings in a database.  
  
*THIS IS NOT THE DATABASE FOR YOUR SCANNER!*
  
Please do not use your scanner database for your [PoracleJS](README.md)

#### Sqlite 

Default option for storing trackings is a sqlite file. 
if your database client is not configured to something else, this would be automatically created when you first launch the bot or migrate from V3

#### MySql install

Easiest way to install a mariadb database, is to use [Docker](https://www.docker.com/get-docker).  
Once you have [Docker](https://www.docker.com/get-docker) installed, you can deploy a mariaDB container with:  
```
docker run --name poracle-mariadb --publish 3306:3306 -e MYSQL_PASSWORD=poraclePassword -e MYSQL_ROOT_PASSWORD=someReallyDifficultAndLongPassword -e MYSQL_USER=poracle -e MYSQL_DATABASE=poracle -d mariadb:latest --max-connections=256
```
This will launch the latest MariaDB container that you can access with  
```json
DB_HOST=127.0.0.1
DB_USER=poracle
DB_PASSWORD=poraclePassword
DB_DATABASE=poracle
DB_PORT=3306
DB_CONNECTION_LIMIT=20
DB_CONNECTION_TIMEOUT=60
``` 
in your config.  

To remove this example container, you can run `docker stop poracle-mariadb && docker rm poracle-mariadb`

