const log = require('../logger')
const cp = require('child_process')
const _ = require('lodash')
const config = require('config')
const mysql = require('promise-mysql2')
const db = mysql.createPool(config.db)

const Cache = require('ttl');

const discordcache = new Cache({
	ttl: config.discord.limitsec * 1000,
});
discordcache.on('put', (key, val, ttl) => { });
discordcache.on('hit', (key, val) => { });

let queue = []

const cache = new Cache({
	ttl: 300 * 1000,
});

const MonsterController = require('../controllers/monster')
const RaidController = require('../controllers/raid')
const monsterController = new MonsterController(db)
const raidController = new RaidController(db)

//check how long the queue is every 30s. ideally empty
setInterval(() => {
	if(queue.length > 30){
		log.warn(`Job queue is ${queue.length} items long`)
	}
}, 30000)


const discord = require('cluster')

discord.setupMaster({ exec: `${__dirname}/../helpers/discord.js`})
_.forEach(config.discord.token, function(k) {
 	discord.fork({k: k}) })



discord.on('message', (worker, msg) => {
	if(msg.reason === 'seppuku'){
		log.warn('discord worker commited seppuku, cloning new')
		discord.fork({k: msg.key})
	}
	if(msg.reason === 'hungry'){
		if (queue.length){
			discord.workers[worker.id].send({reason: 'food', job: queue.shift()})
		}
	}
})



module.exports =  async (req, reply) => {
	let data = req.body
	if (!Array.isArray(data)) data = [ data ]
	data.forEach((hook) => {
		switch(hook.type ){
			case "pokemon":{
				if (!cache.get(`${hook.message.encounter_id}_${hook.message.weight}`)) {
					cache.put(`${hook.message.encounter_id}_${hook.message.weight}`, 'cached')
					monsterController.handle(hook.message).then((work) => {
						work.forEach((job) => {
							const ch = _.cloneDeep(discordcache.get(job.target));
							if (ch === undefined) {
								discordcache.put(job.target, 1);
							}
							else if (ch !== undefined) {
								discordcache.put(job.target, ch + 1);
							}
							let finalMessage = _.cloneDeep(job.message);
							if (discordcache.get(job.target) === config.discord.limitamount + 1){
								finalMessage = `You have reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`
								log.info(`${job.name} reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`)
							}
							if (discordcache.get(job.target) <= config.discord.limitamount + 1) {
								job.message = finalMessage
								queue.push(job)
								monsterController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
							}
						})
					})
				} else {
					log.warn(`Monster encounter:${hook.message.encounter_id} was sent again too soon`)
				}

				reply.send({webserver: 'happy'})
				break
			}
			case "raid": {
				if (!discordcache.get(`${hook.message.gym_id}_${hook.message.pokemon_id}`)) {
					discordcache.put(`${hook.message.gym_id}_${hook.message.pokemon_id}`, 'cached')
				}
				raidController.handle(hook.message)
					.then((work) => {
						work.forEach((job) => {
							const ch = _.cloneDeep(discordcache.get(job.target));
							if (ch === undefined) {
								discordcache.put(job.target, 1);
							}
							else if (ch !== undefined) {
								discordcache.put(job.target, ch + 1);
							}
							let finalMessage = _.cloneDeep(job.message);
							if (discordcache.get(job.target) === config.discord.limitamount + 1) {
								finalMessage = `You have reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`
								log.info(`${job.name} reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`)
							}
							if (discordcache.get(job.target) <= config.discord.limitamount + 1) {
								job.message = finalMessage
								queue.push(job)
								raidController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
							}
						})
					})

				reply.send({webserver: 'happy'})
				break
			}
			case "gym_details": {

					const data = hook.message
					data.park = false
					if (!data.description) data.description = ''
					if (!!(data.sponsor_id)) data.sponsor_id = false
					if (!data.team) data.team = 0
					if (!data.name) data.name = ''
					if (!data.url) data.url = ''
					data.park = data.sponsor_id ? true : false
					data.name = data.name.replace(/"/g, '')
					data.description = data.description.replace(/"/g, '')
					data.name = data.name.replace(/'/g, '')
					data.description = data.description.replace(/'/g, '')
					data.name = data.name.replace(/\n/g, '')
					data.description = data.description.replace(/\n/g, '')
					monsterController.insertOrUpdateQuery(
						'`gym-info`',
						['id', 'gym_name', 'park', 'description', 'url', 'latitude', 'longitude'],
						[`'${data.id}'`, `'${data.name}'`,`${data.park}`, `'${data.description}'`, `'${data.url}'`, `${data.latitude}`, `${data.longitude}`]
					);
					log.info(`Saved gym-details for ${data.name}`);

					reply.send({webserver: 'happy'})
					break
			}
		}
	})



	reply.send(
		{
		objecttype: req.body.type,
		datatype: typeof req.body,
		array: Array.isArray(req.body),
		data: data
		})
}
