const Ajv = require('ajv')

const { botMessageSchema, webhookMessageSchema } = require(`${__dirname}/discordSchema`)

module.exports = (initMsg, type = 'bot') => {
	const msg = typeof initMsg === 'string' ? { content: initMsg } : initMsg
	const ajv = new Ajv()
	switch (type) {
		case 'bot': {
			const validate = ajv.compile(botMessageSchema)
			return validate(msg)
		}
		default: {
			const validate = ajv.compile(webhookMessageSchema)
			return validate(msg)
		}
	}
}
