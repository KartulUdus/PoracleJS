const fs = require('fs')
const { invasions } = require('pogo-data-generator')
const Fetch = require('node-fetch')

const { log } = require('../lib/logger')

const fetch = async (url) => {
	try {
		const data = await Fetch(url)
		if (!data.ok) {
			throw new Error(`${data.status} ${data.statusText} URL: ${url}`)
		}
		return await data.json()
	} catch (e) {
		log.warn(e, `Unable to fetch ${url}`)
	}
}

const update = async function update() {
	// Write monsters/moves/items/questTypes
	try {
		log.info('Fetching latest Game Master...')
		const gameMaster = await fetch('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-poracle.json')

		log.info('Creating new Game Master...')
		Object.keys(gameMaster).forEach((category) => {
			fs.writeFile(
				`./src/util/${category}.json`,
				JSON.stringify(gameMaster[category], null, 2),
				'utf8',
				() => { },
			)
		})
	} catch (e) {
		log.info('Could not fetch latest GM, using existing...')
	}

	// Write grunts
	try {
		log.info('Fetching latest invasions...')
		fs.writeFile(
			'./src/util/grunts.json',
			JSON.stringify(await invasions(), null, 2),
			'utf8',
			() => { },
		)
		log.info('Latest grunts saved...')
	} catch (e) {
		log.warn('Could not generate new invasions, using existing...')
	}

	// Write locales
	try {
		log.info('Creating new locales...')

		fs.mkdir('./src/util/locale', (error) => (error
			? log.info('Locale folder already exists, skipping.')
			: log.info('Locale folder created.')))

		const availableLocales = await fetch('https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/index.json')

		await Promise.all(availableLocales.map(async (locale) => {
			try {
				const remoteFiles = await fetch(`https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/static/enRefMerged/${locale}`)
				fs.writeFile(
					`./src/util/locale/${locale}`,
					JSON.stringify(remoteFiles, null, 2),
					'utf8',
					() => { },
				)
				log.info(`${locale}`, 'file saved.')
			} catch (e) {
				log.warn(`Could not process ${locale}`)
			}
		}))
	} catch (e) {
		log.warn('Could not generate new locales, using existing...')
	}
}

module.exports.update = update

if (require.main === module) {
	update().then(() => { log.info('OK') })
}