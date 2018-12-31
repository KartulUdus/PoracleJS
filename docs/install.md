# Basic install

#### Prerequisites

* [NodeJS](https://nodejs.org/en/) 8 or newer
* Dedicated [MySQL database](mysql.md) version 5.7.6 or newer


#### Install


1. Start by cloning the repository:  
   ```
   git clone https://github.com/KartulUdus/PoracleJS.git
   ```

2. Create A [discord bot](discordbot.md), add it to your server and take not of your token for later


3. Make config files by copying the [examples](https://github.com/KartulUdus/PoracleJS/tree/master/config).
    * Copy `config/dts.json.example` to `config/dts.json` and edit the file if you wish to have [custom messages](dts.md)    
    * Copy `config/default.json.example` to `config/default.json` and [fill the necessary details](config.md)
    
4. Install package requirements:
    ```
    npm install
    ```
5. Test if your config is correct and services are available: 
    ```
    npm test
    ```
6. Start Poracle:

    ```
    npm start
    ```

7. That's it, now proceed to  
[Enter some discord commands](commands.md).
        
