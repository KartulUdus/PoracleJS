const PoracleTelegramMessage = require('../poracleTelegramMessage')
const PoracleTelegramState = require('../poracleTelegramState')

const commandLogic = require('../../poracleMessage/commands/start')
const TelegramReconciliation = require('../telegramReconciliation')

module.exports = async (ctx) => {
	const { controller, command } = ctx.state

	// channel message authors aren't identifiable, ignore all commands sent in channels
	if (Object.keys(ctx.update).includes('channel_post')) return

	try {
		if (ctx.update.message.chat.type === 'private' && controller.config.telegram.registerOnStart) {
			// This is a DM, and we are allowed to attempt to register on start
			const { id } = ctx.update.message.from

			const telegramReconciliation = new TelegramReconciliation(ctx,
				controller.logs.log, controller.config, controller.query, controller.dts)
			await telegramReconciliation.syncTelegramUser(id, true, false)
		}

		const ptm = new PoracleTelegramMessage(ctx)
		const pts = new PoracleTelegramState(ctx)

		await commandLogic.run(pts, ptm, command.splitArgsArray[0])
	} catch (err) {
		controller.logs.telegram.error('Start command unhappy:', err)
	}
}