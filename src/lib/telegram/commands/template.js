
module.exports = (ctx) => {
	ctx.reply('made it to a tlg command')
	// console.log(Object.keys(ctx.update).includes('channel_post') ? Object.keys(ctx.update.channel_post.chat) : Object.keys(ctx.update.message))

	// console.log(Object.keys(ctx.update.channel_post))
	// channel has  ctx.update.channel_post
	// group has ctx.message
	// DM has  ctx.update.message
}