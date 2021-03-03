const NodeCache = require('node-cache')

class UserRateChecker {
	constructor(config) {
		this.config = config
		this.discordCache = new NodeCache({ useClones: false, stdTTL: this.config.alertLimits.timingPeriod })
		this.limitCount = new NodeCache({ stdTTL: (24 * 60 * 60) })
	}

	// eslint-disable-next-line no-unused-vars
	getMessageTimeout(id, type) {
		return this.config.alertLimits.timingPeriod
	}

	// eslint-disable-next-line no-unused-vars
	getMessageLimit(id, type) {
		const limit = type.includes('user') ? this.config.alertLimits.dmLimit : this.config.alertLimits.channelLimit

		return limit
		// return type.includes('user') ? this.config.alertLimits.dmLimit : this.config.alertLimits.channelLimit
	}

	validateMessage(id, type) {
		let ch = this.discordCache.get(id)
		const messageTimeout = this.getMessageTimeout(id, type)
		const messageLimit = this.getMessageLimit(id, type)
		let newCount
		let resetTime
		if (!ch) {
			ch = { count: 1 }
			this.discordCache.set(id, ch, messageTimeout)

			newCount = 1
			resetTime = messageTimeout
		} else {
			newCount = ch.count + 1
			ch.count = newCount

			const ttl = this.discordCache.getTtl(id)
			resetTime = Math.floor((ttl - Date.now()) / 1000)
			if (resetTime > 0) this.discordCache.set(id, ch, resetTime)
		}

		if (newCount > messageLimit) {
			ch.badboy = true
		}

		return {
			passMessage: newCount <= messageLimit,
			justBreached: newCount == messageLimit + 1,
			messageCount: newCount,
			resetTime: Math.max(resetTime, 1),	// Don't look stupid if we are actually at 0
			messageLimit,
			messageTimeout,
		}
	}

	getBadBoys() {
		const badboys = []
		for (const key of this.discordCache.keys()) {
			const ch = this.discordCache.get(key)

			if (ch && ch.badboy) {
				const ttl = this.discordCache.getTtl(key)
				badboys.push({
					key,
					ttlTimeout: ttl,
				})
			}
		}

		return badboys
	}

	/**
	 * Add user to banned list
	 * @param id user id
	 */
	// eslint-disable-next-line no-unused-vars
	userIsBanned(id, type) {
		let ch = this.limitCount.get(id)
		const messageLimit = this.config.alertLimits.maxLimitsBeforeStop
		const messageTimeout = 24 * 60 * 60
		let newCount
		let resetTime
		if (!ch) {
			ch = { count: 1 }
			this.limitCount.set(id, ch, messageTimeout)

			newCount = 1
			resetTime = messageTimeout
		} else {
			newCount = ch.count + 1
			ch.count = newCount

			const ttl = this.limitCount.getTtl(id)
			resetTime = Math.floor((ttl - Date.now()) / 1000)
			if (resetTime > 0) this.limitCount.set(id, ch, resetTime)
		}

		return {
			canContinue: newCount <= messageLimit,
			justBreached: newCount == messageLimit + 1,
			messageCount: newCount,
			resetTime: Math.max(resetTime, 1),	// Don't look stupid if we are actually at 0
			messageLimit,
			messageTimeout,
		}
	}
}

module.exports = UserRateChecker