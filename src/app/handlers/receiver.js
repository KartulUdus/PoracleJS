const log = require('../logger')
const cp = require('child_process')
const _ = require('lodash')
const mysql = require('promise-mysql2')
const config = require('config')
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

//check how long the queue is every 30s. ideally empty
setInterval(() => {
	if(queue.length > 50){
		log.warn(`Job queue is ${queue.length} items long`)
	}
}, 30000)


const discord = require('cluster')

discord.setupMaster({ exec: `${__dirname}/../helpers/discord.js`})
_.forEach(config.discord.token, function(k) {
 	discord.fork({k: k}) })



discord.on('exit', (err) => {
	console.log('A discrod slave died')
	//log.error(`Discord slave exited with errorCode:${err.process._events((x)=> {console.log(x)})}`)
	//discord.fork({k: _.sample(config.discord.token)})

	//console.log(discord.workers)
})

discord.on('message', (worker, msg) => {
	if(msg.reason === 'seppuku'){
		console.log(msg.key)
		log.warn('discord worker commited seppuku, cloning new')
		discord.fork({k: msg.key})
	}
	if(msg.reason === 'hungry'){
		if (queue.length){
			discord.workers[worker.id].send({reason: 'food', job: queue.shift()})
		}

	}
})

discord.on('warning', (worker, msg) => {

})


module.exports =  async (req, reply) => {
	let data = req.body
	if (!Array.isArray(data)) data = [ data ]
	switch(data[0].type ){
		case "pokemon":{
			const monsterController = new MonsterController(db)
			_.forEach(data, function(hook){
				if (!cache.get(`${hook.message.encounter_id}_${hook.message.weight}`)) {
					cache.put(`${hook.message.encounter_id}_${hook.message.weight}`, 'cached')
					monsterController.handle(hook.message).then((work) => {
						work.forEach((job) => {
							const ch = _.cloneDeep(discordcache.get(job.target));
							if (ch === undefined) {
								discordcache.put(job.target, 1);
							}
							else if (ch !== undefined) {
								discordcache.put(job.target, ch + 1, cache._store[job.target].expire - Date.now());
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

				}else{
					log.warn(`Monster encounter:${hook.message.encounter_id} was sent again too soon`)
				}
			})

			//let something = await monsterController.pointInArea([data[0].message.latitude, data[0].message.longitude])
			//let something = await monsterController.selectOneQuery('humans', 'name', 'help')
			reply.send({webserver: 'happy'})

			break
		}
		case "raid":{
			log.info('raid')
			reply.send({webserver: 'happy'})
			break
		}
	}


	reply.send(
		{
		objecttype: req.body.type,
		datatype: typeof req.body,
		array: Array.isArray(req.body),
		data: data
		})
}
