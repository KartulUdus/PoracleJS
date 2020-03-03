const Ajv = require('ajv')

const { botMessageSchema, webhookMessageSchema } = require(`${__dirname}/discordSchema`)

module.exports = (msg, type = 'bot') => {
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
