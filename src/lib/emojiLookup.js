const fs = require('fs')
const path = require('path')

class EmojiLookup {
	constructor(emojis) {
		this.customEmoji = fs.existsSync(path.join(__dirname, '../../config/emoji.json')) ? require(path.join(__dirname, '../../config/emoji.json')) : {}
		this.emojis = emojis
	}

	lookup(emojiName, platform) {
		if (platform in this.customEmoji) {
			const platformEmojis = this.customEmoji[platform]
			if (emojiName in platformEmojis) return platformEmojis[emojiName]
		}

		return (emojiName in this.emojis) ? this.emojis[emojiName] : ''
	}
}

module.exports = EmojiLookup