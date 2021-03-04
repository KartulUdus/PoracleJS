const PoracleTelegramMessage = require('../poracleTelegramMessage')
const PoracleTelegramState = require('../poracleTelegramState')

const commandLogic = require('../../poracleMessage/specials/apply')

module.exports = async (ctx) => {
	const { controller, command } = ctx.state

	// channel message authors aren't identifiable, ignore all commands sent in channels
	if (Object.keys(ctx.update).includes('channel_post')) return

	try {
		const ptm = new PoracleTelegramMessage(ctx)
		const pts = new PoracleTelegramState(ctx)

		await commandLogic.run(pts, ptm, command.splitArgsArray)
	} catch (err) {
		controller.logs.telegram.error('Apply command unhappy:', err)
	}
}