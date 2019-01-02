![logo](https://raw.githubusercontent.com/KartulUdus/PoracleJS/master/docs/_assets/PoracleJS.png)  

[![Build Status](https://travis-ci.org/KartulUdus/PoracleJS.svg?branch=develop)](https://travis-ci.org/KartulUdus/PoracleJS)

#### Introduction

PoracleJS is a NodeJS application for RocketMap WebHook alarms with amqp 🐰.  
It allows for high end-user configurability using discord `!commands` and private message alarms.  

#### Links

- [WIKI](https://kartuludus.github.io/PoracleJS/#/) - Useful for words of wizdom!  
- [Discord](https://discord.gg/WDMr8xX) - Place for #help and #announcments  

### Install
- [Install NodeJS](https://nodejs.org/en/)
- [Create a discord bot and invite it to your server](https://kartuludus.github.io/PoracleJS/#/discordbot)
- [Install a mysql database](https://kartuludus.github.io/PoracleJS/#/mysql)
```bash
git clone https://github.com/KartulUdus/PoracleJS.git   // Clone the repository
cd PoracleJS                                            // Navigate to the root of the project
npm install                                             // install dependencies
cp config/config.example.json config/default.json       // Create a config file and fill out Database and Discord bot stuff
npm start                                               // Start the application

```
