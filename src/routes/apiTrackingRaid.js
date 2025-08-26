const { diff } = require('deep-object-diff')

const trackedCommand = require('../lib/poracleMessage/commands/tracked')

module.exports = async (fastify, options) => {
	fastify.get('/api/tracking/raid/:id', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}
		const human = await fastify.query.selectOneQuery('humans', { id: req.params.id })

		if (!human) {
			return {
				status: 'error',
				message: 'User not found',
			}
		}
		const language = human.language || fastify.config.general.locale
		const translator = fastify.translatorFactory.Translator(language)

		const raids = await fastify.query.selectAllQuery('raid', { id: req.params.id, profile_no: human.current_profile_no })

		const raidWithDesc = await Promise.all(raids.map(async (row) => ({ ...row, description: await trackedCommand.raidRowText(fastify.config, translator, fastify.GameData, row, fastify.scannerQuery) })))

		return {
			status: 'ok',
			raid: raidWithDesc,
		}
	})

	fastify.delete('/api/tracking/raid/:id/byUid/:uid', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		await fastify.query.deleteQuery('raid', { id: req.params.id, uid: req.params.uid })

		return {
			status: 'ok',
		}
	})

	fastify.post('/api/tracking/raid/:id', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		const human = await fastify.query.selectOneQuery('humans', { id: req.params.id })

		if (!human) {
			return {
				status: 'error',
				message: 'User not found',
			}
		}

		const language = human.language || fastify.config.general.locale
		const translator = fastify.translatorFactory.Translator(language)
		const { id } = req.params
		const currentProfileNo = human.current_profile_no

		let insertReq = req.body
		if (!Array.isArray(insertReq)) insertReq = [insertReq]

		const defaultTo = ((value, x) => ((value === undefined) ? x : value))

		const insert = insertReq.map((row) => {
			let level = 9000
			if (row.pokemon_id === 9000) {
				level = +row.level
				if (row.level === undefined || level < 1 || (level > Math.max(...Object.keys(fastify.GameData.utilData.raidLevels).map((k) => +k)) && level !== 90)) {
					throw new Error('Invalid level (must be specified if no pokemon_id')
				}
			}

			return {
				id,
				profile_no: currentProfileNo,
				ping: '',
				template: (row.template || fastify.config.general.defaultTemplateName).toString(),
				pokemon_id: +defaultTo(row.pokemon_id, 9000),
				exclusive: +defaultTo(row.exclusive, 0),
				distance: +defaultTo(row.distance, 0),
				team: row.team >= 0 && row.team <= 4 ? row.team : 4, // carefully chosen to get nulls/undefined to 4 but allow 0
				clean: +defaultTo(+row.clean, 0),
				level: +level,
				form: +defaultTo(row.form, 0),
				move: +defaultTo(row.move, 9000),
				evolution: +defaultTo(row.evolution, 9000),
				gym_id: row.gym_id ? row.gym_id : null,
			}
		})

		try {
			const tracked = await fastify.query.selectAllQuery('raid', { id, profile_no: currentProfileNo })

			const updates = []
			const alreadyPresent = []

			for (let i = insert.length - 1; i >= 0; i--) {
				const toInsert = insert[i]

				for (const existing of tracked.filter((x) => x.team === toInsert.team)) {
					const differences = diff(existing, toInsert)

					switch (Object.keys(differences).length) {
						case 1:		// No differences (only UID)
							// No need to insert
							alreadyPresent.push(toInsert)
							insert.splice(i, 1)
							break
						case 2:		// One difference (something + uid)
							if (Object.keys(differences).some((x) => ['distance', 'template', 'clean'].includes(x))) {
								updates.push({
									...toInsert,
									uid: existing.uid,
								})
								insert.splice(i, 1)
							}
							break
						default:	// more differences
							break
					}
				}
			}

			let message = ''

			if ((alreadyPresent.length + updates.length + insert.length) > 50) {
				message = translator.translateFormat('I have made a lot of changes. See {0}{1} for details', '!', /* util.prefix, */ translator.translate('tracked'))
			} else {
				for (const i of alreadyPresent) {
					message = message.concat(translator.translate('Unchanged: '), await trackedCommand.raidRowText(fastify.config, translator, fastify.GameData, i, fastify.scannerQuery), '\n')
				}
				for (const i of updates) {
					message = message.concat(translator.translate('Updated: '), await trackedCommand.raidRowText(fastify.config, translator, fastify.GameData, i, fastify.scannerQuery), '\n')
				}
				for (const i of insert) {
					message = message.concat(translator.translate('New: '), await trackedCommand.raidRowText(fastify.config, translator, fastify.GameData, i, fastify.scannerQuery), '\n')
				}
			}

			await fastify.query.deleteWhereInQuery(
				'raid',
				{
					id,
					profile_no: currentProfileNo,
				},
				updates.map((x) => x.uid),
				'uid',
			)

			await fastify.query.insertQuery('raid', [...insert, ...updates])

			// Send message to user

			const data = [{
				lat: 0,
				lon: 0,
				message: { content: message },
				target: human.id,
				type: human.type,
				name: human.name,
				tth: { hours: 1, minutes: 0, seconds: 0 },
				clean: false,
				emoji: '',
				logReference: 'WebApi',
				language,
			}]

			data.forEach((job) => {
				if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
				if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
			})

			return {
				status: 'ok',
				message,
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`, err)
			return {
				status: 'error',
				message: 'Exception raised during execution',
			}
		}
	})

	fastify.post('/api/tracking/raid/:id/delete', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		let deleteUids = req.body
		if (!Array.isArray(deleteUids)) deleteUids = [deleteUids]

		await fastify.query.deleteWhereInQuery('raid', {
			id: req.params.id,
		}, deleteUids, 'uid')

		return {
			status: 'ok',
		}
	})
}
