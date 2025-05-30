const { diff } = require('deep-object-diff')

const trackedCommand = require('../lib/poracleMessage/commands/tracked')
const tracked = require('../lib/poracleMessage/commands/tracked')

module.exports = async (fastify, options) => {
	fastify.get('/api/tracking/pokemon/:id', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}
		const human = await fastify.query.selectOneQuery('humans', { id: req.params.id })
		const language = human.language || fastify.config.general.locale
		const translator = fastify.translatorFactory.Translator(language)

		if (!human) {
			return {
				status: 'error',
				message: 'User not found',
			}
		}

		const monsters = await fastify.query.selectAllQuery('monsters', { id: req.params.id, profile_no: human.current_profile_no })

		return {
			status: 'ok',
			pokemon: monsters.map((row) => ({ ...row, description: tracked.monsterRowText(fastify.config, translator, fastify.GameData, row) })),
		}
	})

	fastify.delete('/api/tracking/pokemon/:id/byUid/:uid', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		await fastify.query.deleteQuery('monsters', { id: req.params.id, uid: req.params.uid })

		if (fastify.triggerReloadAlerts) fastify.triggerReloadAlerts()

		return {
			status: 'ok',
		}
	})

	fastify.post('/api/tracking/pokemon/:id/delete', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		let deleteUids = req.body
		if (!Array.isArray(deleteUids)) deleteUids = [deleteUids]

		await fastify.query.deleteWhereInQuery('monsters', {
			id: req.params.id,
		}, deleteUids, 'uid')

		if (fastify.triggerReloadAlerts) fastify.triggerReloadAlerts()

		return {
			status: 'ok',
		}
	})

	fastify.post('/api/tracking/pokemon/:id', options, async (req) => {
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

		const cleanRow = (row) => {
			if (row.pokemon_id === undefined) {
				throw new Error('Pokemon id must be specified')
			}

			let distance = +row.distance || fastify.config.tracking.defaultDistance || 0
			distance = Math.min(distance, fastify.config.tracking.maxDistance || 40000000) // circumference of Earth

			const newRow = {
				id,
				profile_no: +defaultTo(row.profile_no, +currentProfileNo),
				ping: '',
				template: (row.template || fastify.config.general.defaultTemplateName).toString(),
				pokemon_id: +row.pokemon_id,
				distance: +distance,
				min_iv: +defaultTo(row.min_iv, -1),
				max_iv: +defaultTo(row.max_iv, 100),
				min_cp: +defaultTo(row.min_cp, 0),
				max_cp: +defaultTo(row.max_cp, 9000),
				min_level: +defaultTo(row.min_level, 0),
				max_level: +defaultTo(row.max_level, 55),
				atk: +defaultTo(row.atk, 0),
				def: +defaultTo(row.def, 0),
				sta: +defaultTo(row.sta, 0),
				min_weight: +defaultTo(row.min_weight, 0),
				max_weight: +defaultTo(row.max_weight, 9000000),
				form: +defaultTo(row.form, 0),
				max_atk: +defaultTo(row.max_atk, 15),
				max_def: +defaultTo(row.max_def, 15),
				max_sta: +defaultTo(row.max_sta, 15),
				gender: +defaultTo(row.gender, 0),
				clean: +defaultTo(row.clean, 0),
				pvp_ranking_league: +defaultTo(row.pvp_ranking_league, 0),
				pvp_ranking_best: +defaultTo(row.pvp_ranking_best, 1),
				pvp_ranking_worst: +defaultTo(row.pvp_ranking_worst, 4096),
				pvp_ranking_min_cp: +defaultTo(row.pvp_ranking_min_cp, 0),
				pvp_ranking_cap: +defaultTo(row.pvp_ranking_cap, 0),
				size: +defaultTo(row.size, -1),
				max_size: +defaultTo(row.max_size, 5),
				rarity: +defaultTo(row.rarity, -1),
				max_rarity: +defaultTo(row.max_rarity, 6),
				min_time: +defaultTo(row.min_time, 0),
			}
			if (row.uid) {
				newRow.uid = +row.uid
			}
			return newRow
		}

		const insert = insertReq.filter((row) => !row.uid).map(cleanRow)
		const updates = insertReq.filter((row) => row.uid).map(cleanRow)

		try {
			const trackedMonsters = await fastify.query.selectAllQuery('monsters', { id, profile_no: currentProfileNo })

			const alreadyPresent = []

			for (let i = insert.length - 1; i >= 0; i--) {
				const toInsert = insert[i]

				for (const existing of trackedMonsters.filter((x) => x.pokemon_id === toInsert.pokemon_id)) {
					const differences = diff(existing, toInsert)

					switch (Object.keys(differences).length) {
						case 1:		// No differences (only UID)
							// No need to insert
							alreadyPresent.push(toInsert)
							insert.splice(i, 1)
							break
						case 2:		// One difference (something + uid)
							if (Object.keys(differences).some((x) => ['min_iv', 'distance', 'template', 'clean'].includes(x))) {
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
					message = message.concat(translator.translate('Unchanged: '), trackedCommand.monsterRowText(fastify.config, translator, fastify.GameData, i), '\n')
				}
				for (const i of updates) {
					message = message.concat(translator.translate('Updated: '), trackedCommand.monsterRowText(fastify.config, translator, fastify.GameData, i), '\n')
				}
				for (const i of insert) {
					message = message.concat(translator.translate('New: '), trackedCommand.monsterRowText(fastify.config, translator, fastify.GameData, i), '\n')
				}
			}

			// await fastify.query.deleteWhereInQuery('monsters', {
			// 	id,
			// 	profile_no: currentProfileNo,
			// },
			// updates.map((x) => x.uid),
			// 'uid')
			// await fastify.query.insertQuery('monsters', [...insert, ...updates])

			if (insert.length) {
				await fastify.query.insertQuery('monsters', insert)
			}
			for (const row of updates) {
				await fastify.query.updateQuery('monsters', row, { uid: row.uid })
			}

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

			if (fastify.triggerReloadAlerts) fastify.triggerReloadAlerts()

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

	fastify.get('/api/tracking/pokemon/refresh', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		if (fastify.triggerReloadAlerts) fastify.triggerReloadAlerts()

		return {
			status: 'ok',
		}
	})
}
