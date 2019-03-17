# MySQL

A MySQl database is required to store registered users/channels and their trackings  
  
Please do not use your scanner database for your [PoracleJS](README.md)

#### Easy install

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

#### Expert mode


All downloads for MariaDB are located in the [Download](https://downloads.mariadb.org/) section of the official MariaDB foundation website. Click the link to the version you would like, and a list of downloads for multiple operating systems, architectures, and installation file types is displayed.

##### Installing on LINUX/UNIX

If you have intimate knowledge of Linux/Unix systems, simply download source to build your install. Our recommended way of installing is to utilize distribution packages. MariaDB offers packages for the following Linux/Unix distributions −

*   RedHat/CentOS/Fedora
*   Debian/Ubuntu

The following distributions include a MariaDB package in their repositories −

*   openSUSE
*   Arch Linux
*   Mageia
*   Mint
*   Slackware

Follow these steps to install in an Ubuntu environment −

**Step 1** − Login as a root user.

**Step 2** − Navigate to the directory containing the MariaDB package.

**Step 3** − Import the GnuPG signing key with the following code −

`sudo apt-key adv --recv-keys --keyserver keyserver.ubuntu.com 0xcbcb082a1bb943db`

**Step 4** − Add MariaDB to the **sources.list** file. Open the file, and add the following code −

`sudo add-apt-repository 'deb http://ftp.osuosl.org/pub/mariadb/repo/5.5/ubuntuprecise main'`

**Step 5** − Refresh the system with the following −

`sudo apt-get update`

**Step 6** − Install MariaDB with the following −

`sudo apt-get install mariadb-server`

##### Installing on Windows

After locating and downloading an automated install file (MSI), simply double click the file to start the installation. The installation wizard will walk you through every step of installation and any necessary settings.

Test the installation by starting it from the command prompt. Navigate to the location of the installation, typically in the directory, and type the following at the prompt −

`mysqld.exe --console`

If the installation is successful, you will see messages related to startup. If this does not appear, you may have permission issues. Ensure that your user account can access the application. Graphical clients are available for MariaDB administration in the Windows environment. If you find the command line uncomfortable or cumbersome, be sure to experiment with them.

##### Testing the Installation


Perform a few simple tasks to confirm the functioning and installation of MariaDB.

**Use the Admin Utility to Get Server Status**

View the server version with the mysqladmin binary.

`[root@host]# mysqladmin --version`

It should display the version, distribution, operating system, and architecture. If you do not see the output of that type, examine your installation for issues.

**Execute Simple Commands with a Client**

Bring up the command prompt for MariaDB. This should connect you to MariaDB and allow execution of commands. Enter a simple command as follows −

`mysql> SHOW DATABASES;`

##### Post- Installation


After successful installation of MariaDB, set a root password. A fresh install will have a blank password. Enter the following to set the new password −

`mysqladmin -u root password "[enter your password here]";`

Enter the following to connect to the server with your new credentials −
```
mysql -u root -p
Enter password:*******
```

**Creating Database Users**

if you will be connecting to the database locally, you can give it only local access rights
   ```sql
   CREATE DATABASE poracle;
   CREATE USER 'poracle'@'localhost' IDENTIFIED BY 'poraclePassword';
   GRANT ALL PRIVILEGES ON poracle . * TO 'poracle'@'localhost';
   exit
   ```
   
Alternatively, you can grant your user access from anywhere

   ```sql
   CREATE DATABASE poracle;
   CREATE USER 'poracle'@'%' IDENTIFIED BY 'poraclePassword';
   GRANT ALL PRIVILEGES ON poracle . * TO 'poracle'@'%';
   exit
   ```
   