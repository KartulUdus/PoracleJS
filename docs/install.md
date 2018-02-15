# Basic install

#### Prerequisites

* [Git](https://git-scm.com/downloads)
* [NodeJS](https://nodejs.org/en/) 8 or newer
* [RabbitMQ](http://www.rabbitmq.com/download.html) Amqp server
* A working build of [RocketMap](http://rocketmap.readthedocs.io/en/develop/)
* Dedicated [MySQL database](http://rocketmap.readthedocs.io/en/develop/basic-install/mysql.html) version 5.7.6 or newer


#### Install


1. Start by cloning the repository:  
   ```
   git clone https://github.com/KartulUdus/Poracle.git
   ```

2. Create A [discord bot](discordbot.md), add it to your server and take not of your token for later

3. Make sure your [Gmaps api key](gmaps.md) has the following API's enabled:
    * Google Maps Javascript API 
    * Google Maps Geocoding API
    * Google Reverse Geocoding API
    * Google Static Maps API  

4. Make config files by copying the [examples](https://github.com/KartulUdus/PoracleJS/tree/master/config).
    * Copy `config/dts.json.example` to `config/dts.json` and edit the file if you wish to have [custom messages](dts.md)    
    * Copy `config/default.json.example` to `config/default.json` and [fill the necessary details](config.md)
    
5. Install package requirements:
    ```
    npm install
    ```
6. Test if your config is correct and services are available: 
    ```
    npm test
    ```
7. Start the compontets:

`npm run webserver` - starts the webserver (and on initial run creates database)
`npm run worker` - starts queue consuming filter process
`npm run discord` - starts discord bot for registration and tracking

8. That's it, now proceed to [enter some discord commands](commands.md).
        
   
###### Optional steps for linux or mac users


Optionally for better process management, install [pm2](http://pm2.keymetrics.io/) with included script:
`npm run pm2`. Once installed, you can start the application by `npm start` and check running services
 with similar commands:
    * `pm2 list` - will show a list of running pm2 processes  
    * `pm2 restart all` - restarts all pm2 services  
    * `pm2 stop Poracle-Commands` - stops discord command bot  
    * `pm2 monit` - monitors running processes  
    * `pm2 stop all` - stops all services running in pm2  