const fs = require('fs')
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
		const gameMaster = await fetch('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-poracle-v2.json')

		log.info('Creating new Game Master...')
		Object.keys(gameMaster).forEach((category) => {
			fs.writeFileSync(
				`./src/util/${category}.json`,
				JSON.stringify(gameMaster[category], null, 2),
				'utf8',
			)
		})
	} catch (e) {
		log.info('Could not fetch latest GM, using existing...')
	}

	// Write grunts
	if (process.argv[2] === 'latest') {
		try {
			log.info('Fetching latest invasions...')
			fs.writeFileSync(
				'./src/util/grunts.json',
				await fetch('https://raw.githubusercontent.com/WatWowMap/event-info/main/grunts/formatted.json'),
				'utf8',
			)
			log.info('Latest grunts saved...')
		} catch (e) {
			log.warn('Could not generate new invasions, using existing...')
		}
	}

	// Write locales
	try {
		log.info('Creating new locales...')

		try {
			fs.mkdirSync('./src/util/locale')
			log.info('Locale folder created.')
		} catch (error) {
			log.info('Locale folder already exists, skipping.')
		}

		const availableLocales = await fetch('https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/index.json')

		await Promise.all(availableLocales.map(async (locale) => {
			try {
				const remoteFiles = await fetch(`https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/static/enRefMerged/${locale}`)
				fs.writeFileSync(
					`./src/util/locale/${locale}`,
					JSON.stringify(remoteFiles, null, 2),
					'utf8',
				)
				log.info(`${locale}`, 'file saved.')
			} catch (e) {
				log.warn(`Could not process ${locale}`)
			}
			try {
				const remoteI18lFiles = await fetch(`https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/static/locales/${locale}`)
				fs.writeFileSync(
					`./src/util/locale/i18n_${locale}`,
					JSON.stringify(remoteI18lFiles, null, 2),
					'utf8',
				)
				log.info(`i18n_${locale}`, 'file saved.')
			} catch (e) {
				log.warn(`Could not process i18n_${locale}`)
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
