const Discord = require('discord.js');
const client = new Discord.Client();
let config = require('config');
let token = config.discord.token;
let log = require("../logger");

module.exports =

client.on('ready', () => {
    log.info(`Discord botto "${client.user.tag}" ready for action!`);
});


client.login(token);

