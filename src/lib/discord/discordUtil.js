const { DiscordAPIError } = require('discord.js')

class DiscordUtil {
	constructor(client, log, config, query) {
		this.client = client
		this.log = log
		this.config = config
		this.query = query
		this.client = client
	}

	/**
	 * Return channels (by category) for given guild
	 * @param guildId
	 * @returns {Promise<void>}
	 */
	async getChannels(guildId) {
		let guild
		try {
			guild = await this.client.guilds.fetch(guildId)
		} catch (err) {
			this.log.error('Channel Load (Discord) error', err)
			throw err
		}

		const channelList = []
		guild.channels.cache.forEach((x) => {
			if (x.type == 'text') {
				channelList.push({
					id: x.id,
					categoryId: x.parentID,
				})
			}
		})

		return channelList
	}

	/**
	 * get all channels/categories (ids) for known guilds
	 * @returns {Promise<{}>}
	 */
	async getAllChannels() {
		const results = {}
		for (const guildId of this.config.discord.guilds) {
			results[guildId] = await this.getChannels(guildId)
		}
		return results
	}

	/**
	 * return all user roles for a given user, using the discord.js cache
	 * @param id
	 * @returns {Promise<*[roleId]>}
	 */
	async getUserRoles(id) {
		const roleList = []

		for (const guildId of this.config.discord.guilds) {
			let guild
			try {
				guild = await this.client.guilds.fetch(guildId)
			} catch (err) {
				this.log.error('Get User Roles (Discord) error', err)
				throw err
			}
			try {
				const guildMember = await guild.members.fetch({ user: id })
				if (guildMember) {
					for (const role of guildMember.roles.cache.values()) {
						roleList.push(role.id)
					}
				}
			} catch (err) {
				if (err instanceof DiscordAPIError) {
					if (err.code == 10013) { // Unknown user
						// eslint-disable-next-line no-continue
						continue
					}
					if (err.code == 10007) { // Unknown member
						// eslint-disable-next-line no-continue
						continue
					}
				}
				throw err
			}
		}
		return roleList
	}
}

module.exports = DiscordUtil
