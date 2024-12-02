const { diff } = require('deep-object-diff')
const trackedCommand = require('./poracleMessage/commands/tracked')

class TrackingChange {
	constructor(config, query, scannerQuery, translator, GameData) {
		this.config = config
		this.query = query
		this.translator = translator
		this.scannerQuery = scannerQuery
		this.GameData = GameData
		this.categories = ['monsters', 'raid', 'egg', 'quest', 'invasion', 'weather', 'lures', 'gym', 'nests']
	}

	async getProfileNo(id) {
		const human = await this.query.selectOneQuery('humans', { id })
		return human.current_profile_no
	}

	async reset(id, profileNo) {
		if (!profileNo) {
			profileNo = await this.getProfileNo(id)
		}

		for (const category of this.categories) {
			await this.query.deleteQuery(category, {
				id,
				profile_no: profileNo,
			})
		}
	}

	async copy(sourceId, sourceProfileNo, destId, destProfileNo) {
		if (!sourceProfileNo) {
			sourceProfileNo = await this.getProfileNo(sourceId)
		}

		if (!destProfileNo) {
			destProfileNo = await this.getProfileNo(destId)
		}

		for (const category of this.categories) {
			const tempBackup = await this.query.selectAllQuery(category, { id: sourceId, profile_no: sourceProfileNo })
			await this.query.deleteQuery(category, { id: destId, profile_no: destProfileNo })
			await this.query.insertQuery(category, tempBackup.map((x) => ({
				...x, id: destId, profile_no: destProfileNo, uid: undefined,
			})))
		}
	}

	async resolveId(idString) {
		const targets = []
		const humansById = await this.query.selectOneQuery('humans', { id: idString })
		if (humansById) targets.push(humansById)
		const webhookByName = await this.query.selectAllQuery('humans', (builder) => {
			builder.whereIn(
				'type',
				['webhook', 'discord:channel', 'telegram:channel', 'telegram:group'],
			)
				.andWhere('name', 'like', idString)
		})
		if (webhookByName) targets.push(...webhookByName)

		return targets.map((x) => x.id)
	}

	async genericApply(settings, changes, id, profileNo) {
		const insert = changes.filter((row) => !row.uid)
		const updates = changes.filter((row) => row.uid)

		const trackedMonsters = await this.query.selectAllQuery(settings.tableName, { id, profile_no: profileNo })

		const alreadyPresent = []

		for (let i = insert.length - 1; i >= 0; i--) {
			const toInsert = insert[i]

			for (const existing of trackedMonsters.filter((x) => settings.matchRow(x, toInsert))) {
				const differences = diff(existing, toInsert)

				switch (Object.keys(differences).length) {
					case 1:		// No differences (only UID)
						// No need to insert
						alreadyPresent.push(toInsert)
						insert.splice(i, 1)
						break
					case 2:		// One difference (something + uid)
						if (Object.keys(differences).some((x) => settings.singleDifferenceAllowed.includes(x))) {
							updates.push({
								...toInsert,
								uid: existing.uid,
							})
							insert.splice(i, 1)
						}
						break
					default:	// more differences
						break
				}
			}
		}

		let message = ''

		if ((alreadyPresent.length + updates.length + insert.length) > 50) {
			message = this.translator.translateFormat('I have made a lot of changes. See {0}{1} for details', '!', /* util.prefix, */ this.translator.translate('tracked'))
		} else {
			for (const entry of alreadyPresent) {
				message = message.concat(this.translator.translate('Unchanged: '), await settings.rowText(this.config, this.translator, this.GameData, entry, this.scannerQuery), '\n')
			}
			for (const entry of updates) {
				message = message.concat(this.translator.translate('Updated: '), await settings.rowText(this.config, this.translator, this.GameData, entry, this.scannerQuery), '\n')
			}
			for (const entry of insert) {
				message = message.concat(this.translator.translate('New: '), await settings.rowText(this.config, this.translator, this.GameData, entry, this.scannerQuery), '\n')
			}
		}

		// await fastify.query.deleteWhereInQuery('monsters', {
		// 	id,
		// 	profile_no: currentProfileNo,
		// },
		// updates.map((x) => x.uid),
		// 'uid')
		// await fastify.query.insertQuery('monsters', [...insert, ...updates])

		if (insert.length) {
			await this.query.insertQuery(settings.tableName, insert)
		}
		for (const row of updates) {
			await this.query.updateQuery(settings.tableName, row, { uid: row.uid })
		}

		return message
	}

	async applyMonsters(changes, id, profileNo) {
		return this.genericApply({
			tableName: 'monsters',
			matchRow: (a, b) => (a.pokemon_id === b.pokemon_id),
			singleDifferenceAllowed: ['min_iv', 'distance', 'template', 'clean'],
			rowText: trackedCommand.monsterRowText,
		}, changes, id, profileNo)
	}

	async applyEgg(changes, id, profileNo) {
		return this.genericApply({
			tableName: 'egg',
			matchRow: (a, b) => (a.team === b.team),
			singleDifferenceAllowed: ['distance', 'template', 'clean'],
			rowText: trackedCommand.eggRowText,
		}, changes, id, profileNo)
	}
}

module.exports = TrackingChange
