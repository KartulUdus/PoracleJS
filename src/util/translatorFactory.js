const Translator = require('./translate')

class TranslatorFactory {
	constructor(config) {
		this.config = config
		this.translators = {}
		this.commandTranslators = null
	}

	get default() {
		return this.Translator(this.config.general.locale)
	}

	get AltTranslator() {
		return this.Translator(this.config.locale.language)
	}

	get CommandTranslators() {
		if (this.commandTranslators) return this.commandTranslators
		this.commandTranslators = this.config.general.commandLanguages.map((locale) => this.Translator(locale))
		return this.commandTranslators
	}

	reverseTranslateCommand(key) {
		for (const t of this.CommandTranslators) {
			const reverse = t.reverse(key)
			if (reverse !== key) {
				return reverse
			}
		}

		return key
	}

	translateCommand(key) {
		const translations = this.CommandTranslators.map((x) => x.translate(key))
		const unique = []

		return translations.filter((x) => {
			if (!unique.includes(x)) {
				unique.push(x)
				return x
			}
		})
	}

	Translator(locale) {
		if (!this.translators[locale]) {
			this.translators[locale] = new Translator(locale)
		}

		return this.translators[locale]
	}
}

module.exports = TranslatorFactory