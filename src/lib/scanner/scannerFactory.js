const RdmScanner = require('./rdmScanner')
const MadScanner = require('./madScanner')

function createScanner(db, scannerType) {
	switch (scannerType) {
		case 'rdm':
			return new RdmScanner(db)
		case 'mad':
			return new MadScanner(db)
		default:
			return null
	}
}

module.exports = { createScanner }