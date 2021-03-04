const PoracleTelegramMessage = require('../poracleTelegramMessage')
const PoracleTelegramState = require('../poracleTelegramState')

const commandLogic = require('../../poracleMessage/commands/area')

module.exports = async (ctx) => {
	const { controller, command } = ctx.state

	// channel message authors aren't identifiable, ignore all commands sent in channels
	if (Object.keys(ctx.update).includes('channel_post')) return

	try {
		const ptm = new PoracleTelegramMessage(ctx)
		const pts = new PoracleTelegramState(ctx)

		for (const c of command.splitArgsArray) {
			await commandLogic.run(pts, ptm, c)
		}
	} catch (err) {
		controller.logs.telegram.error('Area command unhappy:', err)
	}
}