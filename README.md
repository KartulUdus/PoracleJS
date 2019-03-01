![logo](https://raw.githubusercontent.com/KartulUdus/PoracleJS/master/docs/_assets/PoracleJS.png)  

[![Build Status](https://travis-ci.org/KartulUdus/PoracleJS.svg?branch=master)](https://travis-ci.org/KartulUdus/PoracleJS)

#### Introduction

PoracleJS is a NodeJS application for Discord pokemon alarms. It currently supports wild spawns, raids and quests.  
It allows for high end-user configurability using discord `!commands` and private message or channel alarms.  

#### Links

- [WIKI](https://kartuludus.github.io/PoracleJS/#/) - Useful for words of wizdom!  
- [Discord](https://discord.gg/AathPCp) - Place for #help and #announcments  

### Install
- [Install NodeJS](https://nodejs.org/en/) version 8 or higher
- [Create a discord bot and invite it to your server](https://kartuludus.github.io/PoracleJS/#/discordbot)
- [Install a mysql database](https://kartuludus.github.io/PoracleJS/#/mysql)
```bash
git clone https://github.com/KartulUdus/PoracleJS.git   // Clone the repository
cd PoracleJS                                            // Navigate to the root of the project
npm install                                             // install dependencies
cp .env.example .env && vim .env                        // Edit the config file (.env) and fill out Database and Discord bot
npm start                                               // Start the application

```
