module.exports = (ctx) => {
	console.log(ctx.update, ctx.updateType)
	ctx.log.info('potato')
	console.log(ctx.update[ctx.updateType])
}