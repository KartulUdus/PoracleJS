module.exports = (client) => {
	return {
		poracle: {
			happy: {
				react: (e) => client.setReact(e),
				author: {
					tag: 'authorsTag',
					username: 'happyAuthorsUsername',
					id: 222,
					send: (content) => {
						client.setMessage(content)
					},
				},
				channel: {
					id: '533927791096233984',
					name: 'channelName',
				}
			},
			sad: {
				react: (e) => client.setReact(e),
				author: {
					tag: 'Evil Fella',
					username: 'sadAuthorsUsername',
					id: 222,
					send: (content) => {
						client.setMessage(content)
					},
				},
				channel: {
					id: 'IncorrectChannelId',
					name: 'Incorrect Channel',
				}
			}
		},
		location: {
			humans: [{
				id: '123456789',
				type: 'webhook',
				name: 'registeredwebhook',
				enabled: 1,
				area: '[]',
				latitude: 0,
				longitude: 0,
				fails: 0,
				last_checked: new Date().toUTCString(),
			},
			{
				id: '222',
				type: 'discord:user',
				name: 'happyAuthorsUsername',
				enabled: 1,
				area: '[]',
				latitude: 0,
				longitude: 0,
				fails: 0,
				last_checked: new Date().toUTCString(),
			},
			{
				id: '333',
				type: 'discord:channel',
				name: 'testingChannel',
				enabled: 1,
				area: '[]',
				latitude: 0,
				longitude: 0,
				fails: 0,
				last_checked: new Date().toUTCString(),
			}],
			happy: {
				reply: (msg) => client.setMessage(msg),
				react: (e) => client.setReact(e),
				author: {
					tag: 'registeredUserInTallinn',
					username: 'happyAuthorsUsername',
					id: '222',
					send: (content) => {
						client.setMessage(content)
					},
				},
				channel: {
					id: 'UsersDMChannel',
					name: 'channelName',
					type: 'dm',
				},
				content: '.location tallinn',
			},
			happyAdmin: {
				reply: (msg) => client.setMessage(msg),
				react: (e) => client.setReact(e),
				author: {
					tag: 'AdminRegistersChannelLocation',
					username: 'happyAuthorsUsername',
					id: '222742859059560458',
					send: (content) => {
						client.setMessage(content)
					},
				},
				channel: {
					id: '333',
					name: 'adminSetLocationInThisChannel',
					type: 'text',
				},
				content: '.location tallinn',
			},
			sadAdmin: {
				reply: (msg) => client.setMessage(msg),
				react: (e) => client.setReact(e),
				author: {
					tag: 'AdminRegistersChannelLocation',
					username: 'happyAuthorsUsername',
					id: '222742859059560458',
					send: (content) => {
						client.setMessage(content)
					},
				},
				channel: {
					id: '3333',
					name: 'channelUnregistered',
					type: 'text',
				},
				content: '.location tallinn',
			},
			happyAdminWebhook: {
				reply: (msg) => client.setMessage(msg),
				react: (e) => client.setReact(e),
				author: {
					tag: 'registeredUserInTallinn',
					username: 'happyAuthorsUsername',
					id: '222742859059560458',
					send: (content) => {
						client.setMessage(content)
					},
				},
				channel: {
					id: '533927791096233984',
					name: 'channelName',
					type: 'dm',
				},
				content: '.location nameregisteredwebhook tallinn',
			},
			sadAdminWebhook: {
				reply: (msg) => client.setMessage(msg),
				react: (e) => client.setReact(e),
				author: {
					tag: 'registeredUserInTallinn',
					username: 'happyAuthorsUsername',
					id: '222742859059560458',
					send: (content) => {
						client.setMessage(content)
					},
				},
				channel: {
					id: '533927791096233984',
					name: 'channelName',
					type: 'dm',
				},
				content: '.location nameregisteredwebhookthatdoesntexist tallinn',
			},
			sad: {
				reply: (msg) => client.setMessage(msg),
				react: (e) => client.setReact(e),
				author: {
					tag: 'registeredUserInTallinn',
					username: 'happyAuthorsUsername',
					id: '15867',
					send: (content) => {
						client.setMessage(content)
					},
				},
				channel: {
					id: '533927791096233984',
					name: 'channelName',
					type: 'dm',
				},
				content: '.location tallinn',
			},
		}
	}
}