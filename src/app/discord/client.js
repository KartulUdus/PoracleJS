const Discord = require('discord.js');

const client = new Discord.Client();
const config = require('config');
const log = require('../logger');

module.exports =

client.on('ready', () => {
	log.info(`Discord botto "${client.user.tag}" ready for action!`);
});

client.login(config.discord.token);

