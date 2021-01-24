const fs = require('fs')
const path = require('path')

class Translator {
	constructor(region) {
		const defaultData = fs.existsSync(path.join(__dirname, `../../config/locale/${region}.json`)) ? require(path.join(__dirname, `../../config/locale/${region}.json`)) : {}
		const dataAddition = fs.existsSync(path.join(__dirname, `../../config/custom.${region}.json`)) ? require(path.join(__dirname, `../../config/custom.${region}.json`)) : {}
		this.data = { ...defaultData, ...dataAddition }
	}

	translate(bit, lowercase = false) {
		let word = bit
		if (lowercase) {
			word = word.toLowerCase()
			let match = ''
			const matched = Object.keys(this.data).find((key, index) => {
				if (key.toLowerCase() === word) match = Object.values(this.data)[index]
				return key.toLowerCase() === word
			})
			return matched ? match : word
		}
		return this.data[bit] ? this.data[bit] : bit
	}

	reverse(bit, lowercase = false) {
		let word = bit
		if (lowercase) {
			word = word.toLowerCase()
			let match = ''
			const matched = Object.values(this.data).find((key, index) => {
				if (key.toLowerCase() === word) match = Object.keys(this.data)[index]
				return key.toLowerCase() === word
			})
			return matched ? match : bit
		}
		return Object.keys(this.data).find((key) => this.data[key] === word) ? Object.keys(this.data).find((key) => this.data[key] === word) : bit
	}
}

module.exports = Translator