module.exports = async (ctx) => {
	const { controller } = ctx.state

	try {
		// channel message authors aren't identifiable, ignore all commands sent in channels
		if (Object.keys(ctx.update).includes('channel_post')) {
			ctx.reply(`This channel is id: [ ${ctx.update.channel_post.chat.id} ] and your id is: 🤷 - this is a channel`)
		} else {
			ctx.reply(`This channel is id: [ ${ctx.update.message.chat.id} ] and your id is: [ ${ctx.update.message.from.id} ]`)
		}
	} catch (err) {
		controller.logs.telegram.error('TEMPLATE command unhappy:', err)
	}
}