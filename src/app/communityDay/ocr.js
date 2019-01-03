const tesseract = require('tesseractocr')
const Jimp = require('jimp')
const fs = require('fs')
const config = require('config')
const replaceColor = require('replace-color')
const _ = require('lodash')

const recognize = tesseract.withOptions({
	psm: 11,
	oem: 3,
	language: ['eng']
})

const monsterData = require(config.locale.commandMonstersJson)
const query = require('../sql/queries')

const seenregex = new RegExp('[sen]{4}:\\d+', 'gi')
const caughtregex = new RegExp('[caughto]{6}:\\d+', 'gi')
const luckyregex = new RegExp('[luckyvro]{5}:\\d+', 'gi')

const log = require('../logger')

const data = { activeEvent: false }


function detect(imgLocation, callback) {
	query.findActiveComEvent((err, event) => {
		if (err) log.error(err)
		if (!event) return callback(err, data)
		const eventmon = event.monster_id.split(',').map(id => monsterData[id].name.toUpperCase())
		console.log('eventmon')

		data.correctPokemon = false
		data.activeEvent = eventmon

		const tmpFilename = `${__dirname}/images/${Math.floor(Math.random() * Math.floor(999999))}.png` // generate temp filename
		Jimp.read(imgLocation, (err, img) => {			// resize and crop the image for better recognition
			img
				.resize(567, 1007)
				.grayscale()
				.brightness(0.77)
				.contrast(0.15)
				.crop(15, 300, 550, 300)
				.write(tmpFilename)

			replaceColor({
				image: tmpFilename,
				colors: {
					type: 'hex',
					targetColor: '#FFFFFF',
					replaceColor: '#000000'
				}
			}, (err, jimpObject) => {
				if (err) log.error(err)
				jimpObject.write(tmpFilename, (err) => {
					if (err) log.error(err)

					recognize(`${tmpFilename}`, (err, text) => {
						if (err) log.error(err)
						if (!config.general.logLevel === 'debug') fs.unlinkSync(tmpFilename)		// delete temp file
						text = text.toUpperCase()

						const dataArray = text.replace(/ /g, '').split('\n')
						data.detectedOCR = dataArray

						dataArray.forEach((element) => {				// Search for known datapoints in detected text

							const matchSeen = seenregex.exec(element.replace('/o/gi', '0'))
							const matchCaught = caughtregex.exec(element.replace('/o/gi', '0'))
							const matchLucky = luckyregex.exec(element.replace('/o/gi', '0'))

							if (matchSeen) data.seenCount = parseInt(matchSeen[0].replace(new RegExp('[sen]{4}:', 'gi'), ''), 10)
							if (matchCaught) data.caughtCount = parseInt(matchCaught[0].replace(new RegExp('[caughto]{6}:', 'gi'), ''), 10)
							if (matchLucky) data.luckyCount = parseInt(matchLucky[0].replace(new RegExp('[luckyvro]{5}:', 'gi'), ''), 10)
							if (_.includes(eventmon, element)) {
								data.correctPokemon = true
								data.monster_id = _.findKey(monsterData, mon => mon.name.toUpperCase() === element)
							}
						})
						log.debug(data)
						return callback(err, data)		// send object of data
					})
				})
			})


		})
	})
}

module.exports = {
	detect
}

