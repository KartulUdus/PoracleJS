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
		}
	}
}