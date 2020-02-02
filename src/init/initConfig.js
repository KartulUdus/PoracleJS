const config = require('config')
const path = require('path')
const reader = require('readline-sync')
const fs = require('fs')
const { log } = require('../lib/logger')

const discordRe = /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/g
const telegramRe = /[0-9]{9}:[a-zA-Z0-9_-]{35}/gm

// fs.writeFileSync(path.join(__dirname, '../../config/local.json'), defaultConfig)


async function run() {
	let useDiscord = false
	let discordToken = ''
	let useTelegram = false
	let telegramToken = ''
	let discordConfigFinished = false
	let telegramConfigFinished = false
	let mvpConfig = false

	while (!mvpConfig) {
		while (!discordConfigFinished) {
			useDiscord = ['y', 'yes', 'yep', 'affirmative'].includes((reader.question('Would you like to use Discord (Y/N)')).toLowerCase())
			if (useDiscord) {
				discordToken = reader.question('Please enter your discord token ')
				if (!discordToken.match(discordRe)) {
					log.warn('that\'s not a discord token, try again: ')
				} else {
					config.discord.token = [discordToken]
				}
			}
			discordConfigFinished = (!useDiscord || discordToken.match(discordRe))
		}

		while (!telegramConfigFinished) {
			useTelegram = ['y', 'yes', 'yep', 'affirmative'].includes((reader.question('Would you like to use Telegram (Y/N)')).toLowerCase())
			if (useTelegram) {
				telegramToken = reader.question('Please enter your tlegram token ')
				if (!telegramToken.match(discordRe)) {
					log.warn('that\'s not a telegrram token, try again:')
				} else {
					config.telegram.token = telegramToken
				}
			}
			telegramConfigFinished = (!useTelegram || telegramToken.match(telegramRe))
		}
		mvpConfig = useTelegram || useDiscord
	}

	fs.writeFileSync(path.join(__dirname, '../../config/local.json'), JSON.stringify(config, null, 4))

	log.info(`your config has been created at ${path.join(__dirname, '../../config/local.json')}. Edit this file if you need config changes.`)
}


run()