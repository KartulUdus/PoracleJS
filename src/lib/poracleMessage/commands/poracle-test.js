const stripJsonComments = require('strip-json-comments')
const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, args, options) => {
	try {
		if (!msg.isFromAdmin) return await msg.react('🙅')

		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const human = await client.query.selectOneQuery('humans', { id: target.id })

		let template = client.config.general.defaultTemplateName?.toString() ?? '1'

		const validHooks = ['pokemon', 'raid', 'egg', 'invasion', 'pokestop', 'gym', 'nest', 'weather']

		const hookType = args[0]
		if (!validHooks.includes(hookType)) {
			await msg.reply('Hooks supported are: '.concat(validHooks.join(', ')))
			return
		}

		let testdata

		try {
			const rawText = stripJsonComments(fs.readFileSync(path.join(__dirname, '../../../../config/testdata.json'), 'utf8'))
			testdata = JSON.parse(rawText)
		} catch (err) {
			await msg.reply('Cannot read testdata.json - see log file for details')
			throw new Error(`testdata.json - ${err.message}`)
		}

		const testId = args[1]

		if (!testId) {
			let message = `Tests found for hook type ${hookType}:\n\n`

			for (const test of testdata.filter((x) => x.type === hookType)) {
				message = message.concat(`  ${test.test}\n`)
			}

			return await msg.reply(message)
		}

		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].match(client.re.templateRe)) {
				[, , template] = args[i].match(client.re.templateRe)
				args.splice(i, 1)
			}
		}

		const dataItem = testdata.find((x) => x.type === hookType && x.test === testId)

		if (!dataItem) {
			await msg.reply(`Cannot find hook type ${hookType} test id ${testId}`)
			return
		}

		const hook = dataItem.webhook
		hook.poracleTest = {
			type: target.type,
			id: target.id,
			name: target.name,
			latitude: human.latitude,
			longitude: human.longitude,
			language: 'en',
			template,
		}

		if (dataItem.location !== 'keep') {
			hook.latitude = human.latitude
			hook.longitude = human.longitude
		}

		// Freshen test data
		switch (hookType) {
			case 'pokemon': {
				hook.disappear_time = Date.now() / 1000 + 10 * 60
				break
			}
			case 'raid': {
				hook.start = Date.now() / 1000 + 10 * 60
				hook.end = hook.start + 30 * 60
				break
			}
			default:
		}

		await msg.reply(`Queueing test hook ${hookType} test [${testId}] template [${template}]`)

		client.addToWebhookQueue({
			type: dataItem.type,
			message: hook,
		})
	} catch (err) {
		client.log.error(`poracle-test command ${msg.content} unhappy:`, err)
	}
}
