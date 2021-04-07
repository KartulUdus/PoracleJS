const fs = require('fs')
const path = require('path')

class Translator {
	constructor(region) {
		const moveNames = fs.existsSync(path.join(__dirname, `locale/moveNames_${region}.json`)) ? require(path.join(__dirname, `locale/moveNames_${region}.json`)) : {}
		const pokemonNames = fs.existsSync(path.join(__dirname, `locale/pokemonNames_${region}.json`)) ? require(path.join(__dirname, `locale/pokemonNames_${region}.json`)) : {}
		const defaultData = fs.existsSync(path.join(__dirname, `../../config/locale/${region}.json`)) ? require(path.join(__dirname, `../../config/locale/${region}.json`)) : {}
		const dataAddition = fs.existsSync(path.join(__dirname, `../../config/custom.${region}.json`)) ? require(path.join(__dirname, `../../config/custom.${region}.json`)) : {}
		this.data = {
			...moveNames, ...pokemonNames, ...defaultData, ...dataAddition,
		}

		// remove duplicates
		for (const [k, v] of Object.entries(this.data)) { if (k.toLowerCase() === v.toLowerCase()) delete this.data[k] }
	}

	// eslint-disable-next-line class-methods-use-this
	format(str, ...args) {
		let newStr = str
		let i = args.length
		while (i--) {
			newStr = newStr.replace(new RegExp(`\\{${i}\\}`, 'gm'), args[i])
		}
		return newStr
	}

	translateFormat(bit, ...args) {
		return this.format(this.data[bit] ? this.data[bit] : bit, ...args)
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
				const lCaseKey = key.toLowerCase()
				if (lCaseKey === word) match = Object.keys(this.data)[index]
				return lCaseKey === word && match.toLowerCase() !== word
			})
			return matched ? match.toLowerCase() : bit
		}
		return Object.keys(this.data).find((key) => this.data[key] === word) ? Object.keys(this.data).find((key) => this.data[key] === word) : bit
	}
}

module.exports = Translator
