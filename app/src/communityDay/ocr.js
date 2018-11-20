const tesseract = require('tesseractocr');
const Jimp = require('jimp');
const fs = require('fs');
const config = require('config');

const recognize = tesseract.withOptions({
	psm: 11,
	oem: 3,
	language: ['eng']
});

const monsterData = require(config.locale.commandMonstersJson);
const query = require('../sql/queries');

const seenregex = new RegExp('SEEN:\\d+', 'gi');
const caughtregex = new RegExp('CAUGHT:\\d+', 'gi');
const luckyregex = new RegExp('LUCKY:\\d+', 'gi');

const log = require('../logger');

const data = { activeEvent: false };


function detect(imgLocation, callback) {
	query.findActiveComEvent((err, event) => {
		if (err) log.error(err);
		if (!event) return callback(err, data);
		const eventmon = monsterData[event.monster_id].name;
		const monregex = new RegExp(eventmon, 'gi');
		data.correctPokemon = false;
		data.activeEvent = eventmon;

		const tmpFilename = `${__dirname}/images/${Math.floor(Math.random() * Math.floor(999999))}.png`; // generate temp filename
		Jimp.read(imgLocation, (err, img) => {			// resize and crop the image for better recognition
			img
				.resize(567, 1007)
				.grayscale()
				.posterize(5)
				.invert()
				.contrast(1)
				.crop(15, 300, 550, 300)
				.write(tmpFilename);
			recognize(`${tmpFilename}`, (err, text) => {
				if(err) log.error(err)
				if(!config.general.logLevel === 'debug') fs.unlinkSync(tmpFilename);		// delete temp file

				const dataArray = text.replace(/ /g, '').split('\n');

				data.detectedOCR = dataArray

					dataArray.forEach((element) => {				// Search for known datapoints in detected text

					const matchSeen = seenregex.exec(element.replace('/o/gi', '0'));
					const matchCaught = caughtregex.exec(element.replace('/o/gi', '0'));
					const matchLucky = luckyregex.exec(element.replace('/o/gi', '0'));

					if (matchSeen) data.seenCount = parseInt(matchSeen[0].replace('SEEN:', ''));
					if (matchCaught) data.caughtCount = parseInt(matchCaught[0].replace('CAUGHT:', ''));
					if (matchLucky) data.luckyCount = parseInt(matchLucky[0].replace('LUCKY:', ''));
					if (element.match(monregex)) data.correctPokemon = true;
				});
				log.debug(data);
				return callback(err, data);		// send object of data
			});
		});
	});
}

module.exports = {
	detect
};

