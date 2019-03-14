const fp = require('fastify-plugin')
const { Nuxt, Builder } = require('nuxt')
const defaults = require('lodash.defaults')
const mainConfig = require('config')

const webRoot = mainConfig.general.webroot || '/'

module.exports = fp((fastify, opts, next) => {
	if (!opts.config || typeof opts.config !== 'object') {
		return next(new Error('You need to provide a nuxt config.'))
	}
	const config = opts.config || {}
	if (typeof (config.dev) !== typeof (true)) {
		config.dev = process.env.NODE_ENV !== 'production'
	}
	const nuxt = new Nuxt(config)
	let attachProperties = []
	if (opts.attachProperties && Array.isArray(opts.attachProperties)) {
		[attachProperties] = opts
	}

	let build = true
	let buildPromise = Promise.resolve()

	if (config.dev) {
		build = false
		buildPromise = new Builder(nuxt).build().then(() => {
			build = true
		})
	}

	fastify.decorate('nuxt', (path, options = {}) => {
		if (options.handler && typeof options.handler === 'function') {
			options.handler = async (request, reply) => {
				if (!build) {
					await buildPromise
				}
				return options.handler(request, reply, nuxt)
			}
		}
		const opt = defaults({
			method: 'GET',
			url: path,
			handler: async (request, reply) => {
				if (!build) {
					await buildPromise
				}
				reply.sent = true
				const rq = request.raw
				for (const key of attachProperties) {
					if (request[key]) rq[key] = request[key]
				}
				return nuxt.render(rq, reply.res)
			},
		}, options)
		fastify.route(opt)
	}).after(() => {
		fastify.nuxt(`${webRoot}_nuxt/*`)
		fastify.nuxt(`${webRoot}__webpack_hmr/*`, {
			method: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS'],
		})
	})
	next()
}, {
	fastify: '>=1.0.0',
})