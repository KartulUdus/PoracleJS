const fs = require('fs')
const { resolve } = require('path')
const fetch = require('node-fetch')
const stripJsonComments = require('strip-json-comments')

const { log } = require('../lib/logger')

const parseConfigSafe = () => {
	let config = {}
	try {
		if (fs.existsSync(resolve(__dirname, '../../config/local.json'))) {
			const string = stripJsonComments(
				fs
					.readFileSync(resolve(__dirname, '../../config/local.json'))
					.toString(),
			)
			config = JSON.parse(string)
		} else {
			log.warn('[KŌJI] Local.json was not found, skipping')
		}
		return config
	} catch (e) {
		log.error('[KŌJI] Could not parse local config', e)
		return config
	}
}

const getKojiFences = async () => {
	const config = parseConfigSafe()
	try {
		if (config?.geofence?.kojiOptions?.bearerToken) {
			const fences = Array.isArray(config.geofence?.path)
				? config.geofence.path
				: [config.geofence.path]

			await Promise.allSettled(
				fences.map((fencePath) => {
					if (fencePath.startsWith('http')) {
						log.info(`[KŌJI] Fetching ${fencePath}...`)
						return fetch(fencePath, {
							headers: {
								Authorization: `Bearer ${config.geofence.kojiOptions.bearerToken}`,
								'Content-Type': 'application/json',
							},
						})
							.then((res) => res.json())
							.then((json) => {
								fs.writeFileSync(
									resolve(
										__dirname,
										`../../.cache/${fencePath.replace(/\//g, '__')}.json`,
									),
									JSON.stringify(json.data, null, 2),
									'utf8',
								)
							})
							.catch((e) => log.warn(`[KŌJI] Could not process ${fencePath}`, e))
					}
					return null
				}),
			)
		} else {
			log.info('[KŌJI] Kōji bearer token not found, skipping')
		}
	} catch (e) {
		log.error('[KŌJI] Could not process Kōji settings', e)
	}
}

module.exports.getKojiFences = getKojiFences

if (require.main === module) {
	getKojiFences().then(() => {
		log.info('OK')
	})
}
