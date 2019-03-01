# Basic install

#### Prerequisites

* [NodeJS](https://nodejs.org/en/) 8 or newer
* Dedicated [MySQL database](mysql.md) version 5.7.6 or newer


#### Install


1. Start by cloning the repository:  
   ```
   git clone https://github.com/KartulUdus/PoracleJS.git
   ```

2. Create a [discord bot](discordbot.md), add it to your server and take note of your token for later


3. Edit the config file (`cp .env.example .env && vim .env`) and fill out Database and Discord bot
    
    
4. Install package requirements:
    ```
    npm install
    ```
5. Start Poracle:

    ```
    npm start
    ```

7. That's it, now proceed to  
[Enter some discord commands](commands.md).
        
