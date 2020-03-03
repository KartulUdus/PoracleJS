const UINT24_MAX = Math.pow(2, 24) - 1

const ISO_8601 = /^(\d{4})-(\d\d)-(\d\d)([T ](\d\d):(\d\d):(\d\d)(\.\d+)?(Z)?)?$/

const embedSchema = {
	type: 'object',
	additionalProperties: false,
	disallowed: ['type', 'provider', 'video'],
	minProperties: 1,
	properties: {
		title: { type: 'string', maxLength: 256, trim: true },
		url: { type: 'string' },
		description: { type: 'string', maxLength: 2048, trim: true },
		timestamp: { type: 'string', pattern: ISO_8601.source },
		color: { type: 'integer', maximum: UINT24_MAX },
		footer: {
			type: 'object',
			additionalProperties: false,
			disallowed: ['proxy_icon_url'],
			properties: {
				text: { type: 'string', maxLength: 2048, trim: true },
				icon_url: { type: 'string' },
				proxy_icon_url: {},
			},
		},
		image: {
			type: 'object',
			additionalProperties: false,
			disallowed: ['proxy_url', 'width', 'height'],
			properties: {
				url: { type: 'string' },
				proxy_url: {},
				width: {},
				height: {},
			},
		},
		thumbnail: {
			type: 'object',
			additionalProperties: false,
			disallowed: ['proxy_url', 'width', 'height'],
			properties: {
				url: { type: 'string' },
				proxy_url: {},
				width: {},
				height: {},
			},
		},
		author: {
			type: 'object',
			additionalProperties: false,
			disallowed: ['proxy_icon_url'],
			required: ['name'],
			properties: {
				name: { type: 'string', maxLength: 256, trim: true },
				url: { type: 'string' },
				icon_url: { type: 'string' },
				proxy_icon_url: {},
			},
		},
		fields: {
			type: 'array',
			maxItems: 25,
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['name', 'value'],
				properties: {
					name: { type: 'string', maxLength: 256, trim: true },
					value: { type: 'string', maxLength: 1024, trim: true },
					inline: { type: 'boolean' },
				},
			},
		},
		provider: {},
		video: {},
		type: {},
	},
}

const botMessageSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		content: {
			type: 'string',
			maxLength: 2000,
			trim: true,
		},
		embed: embedSchema,
	},
	atLeastOneOf: ['content', 'embed'],
}

const webhookMessageSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		username: { type: 'string', maxLength: 256 },
		avatar_url: { type: 'string' },
		content: { type: 'string', maxLength: 2000, trim: true },
		embeds: { type: 'array', maxItems: 10, items: embedSchema },
		tts: { type: 'boolean' },
		file: {},
	},
	atLeastOneOf: ['content', 'embeds'],
}

module.exports = { botMessageSchema, webhookMessageSchema }