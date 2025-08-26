const { diff } = require('deep-object-diff')

const trackedCommand = require('../lib/poracleMessage/commands/tracked')

module.exports = async (fastify, options) => {
	fastify.get('/api/tracking/quest/:id', options, async (req) => {
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

		const quest = await fastify.query.selectAllQuery('quest', { id: req.params.id, profile_no: human.current_profile_no })

		return {
			status: 'ok',
			quest,
		}
	})

	fastify.delete('/api/tracking/quest/:id/byUid/:uid', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		await fastify.query.deleteQuery('quest', { id: req.params.id, uid: req.params.uid })

		return {
			status: 'ok',
		}
	})

	fastify.post('/api/tracking/quest/:id', options, async (req) => {
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
			const rewardType = +row.reward_type
			if (![3, 12, 4, 7, 2].includes(rewardType)) {
				throw new Error('Unrecognised reward_type value')
			}
			return {
				id,
				profile_no: currentProfileNo,
				ping: '',
				template: (row.template || fastify.config.general.defaultTemplateName).toString(),
				distance: +defaultTo(row.distance, 0),
				clean: +defaultTo(row.clean, 0),
				reward_type: rewardType,
				reward: +defaultTo(row.reward, 0),
				amount: +defaultTo(row.amount, 0),
				form: +defaultTo(row.form, 0),
			}
		})

		try {
			const tracked = await fastify.query.selectAllQuery('quest', { id, profile_no: currentProfileNo })

			const updates = []
			const alreadyPresent = []

			for (let i = insert.length - 1; i >= 0; i--) {
				const toInsert = insert[i]

				for (const existing of tracked.filter((x) => x.reward_type === toInsert.reward_type && x.reward === toInsert.reward)) {
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
					message = message.concat(translator.translate('Unchanged: '), trackedCommand.questRowText(fastify.config, translator, fastify.GameData, i), '\n')
				}
				for (const i of updates) {
					message = message.concat(translator.translate('Updated: '), trackedCommand.questRowText(fastify.config, translator, fastify.GameData, i), '\n')
				}
				for (const i of insert) {
					message = message.concat(translator.translate('New: '), trackedCommand.questRowText(fastify.config, translator, fastify.GameData, i), '\n')
				}
			}

			await fastify.query.deleteWhereInQuery(
				'quest',
				{
					id,
					profile_no: currentProfileNo,
				},
				updates.map((x) => x.uid),
				'uid',
			)

			await fastify.query.insertQuery('quest', [...insert, ...updates])

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

	fastify.post('/api/tracking/quest/:id/delete', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		let deleteUids = req.body
		if (!Array.isArray(deleteUids)) deleteUids = [deleteUids]

		await fastify.query.deleteWhereInQuery('quest', {
			id: req.params.id,
		}, deleteUids, 'uid')

		return {
			status: 'ok',
		}
	})
}
