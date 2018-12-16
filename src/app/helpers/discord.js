const Discord = require('discord.js');

const client = new Discord.Client();
const config = require('config');
const log = require('../logger');


client.on('ready', () => {
	log.info(`Discord botto "${client.user.tag}" ready for action!`);
	process.on('message', (msg) => {
		if (msg.reason === 'food'){
			if (client.channels.keyArray().includes(msg.job.target)) {
				client.channels.get(msg.job.target).send(msg.job.message).then((message) => {
					if (config.discord.typereact) {
						msg.job.emoji.forEach((emoji) => {
							message.react(emoji);
						});
					}
				});
			}
			else if (client.users.keyArray().includes(msg.job.target)) {
				client.users.get(msg.job.target).send(msg.job.message).then((message) => {
					if (config.discord.typereact) {
						msg.job.emoji.forEach((emoji) => {
							message.react(emoji);
						});
					}
				});
			}
			else log.warn(`Tried to send message to ID ${msg.job.id}, but error ocurred`);
		}


	})

	setInterval(() => {
		process.send({reason:'hungry'})
	}, 10)
})


client.login(process.env.k)
	.catch(function(err) {
		log.error(err.message);
		process.send({reason:'seppuku', key:process.env.k})
		process.exit()
	})

