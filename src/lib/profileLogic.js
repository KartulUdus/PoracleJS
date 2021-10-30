class ProfileLogic {
	constructor(query, id) {
		this.query = query
		this.id = id
		this.categories = ['monsters', 'raid', 'egg', 'quest', 'invasion', 'weather', 'lures', 'gym', 'nests']
	}

	async init() {
		this.human = await this.query.selectOneQuery('humans', { id: this.id })
		this.profiles = await this.query.selectAllQuery('profiles', { id: this.id })
	}

	async profileNoFromName(profileName) {
		const profile = this.profiles.find((x) => x.name.toLowerCase() === profileName)
		if (!profile) return 0

		return profile.profile_no
	}

	async profileNoExists(profileNo) {
		if (!this.human) await this.init()
		return this.profiles.some((x) => x.profile_no === profileNo)
	}

	async updateHours(profileNo, hours) {
		await this.query.updateQuery('profiles', { active_hours: JSON.stringify(hours) }, { id: this.id, profile_no: profileNo })
	}

	async addProfile(name, hours) {
		if (!this.human) await this.init()

		let newProfileNo = 1
		let retry
		do {
			retry = false

			for (const profile of this.profiles) {
				if (profile.profile_no === newProfileNo) {
					newProfileNo++
					retry = true
				}
			}
		} while (retry)

		await this.query.insertQuery('profiles', {
			id: this.id,
			profile_no: newProfileNo,
			name,
			area: this.human.area,
			latitude: this.human.latitude,
			longitude: this.human.longitude,
			active_hours: hours || '{}',
		})
	}

	async copyProfile(sourceProfileNo, destProfileNo) {
		for (const category of this.categories) {
			const tempBackup = await this.query.selectAllQuery(category, { id: this.id, profile_no: sourceProfileNo })
			await this.query.deleteQuery(category, { id: this.id, profile_no: destProfileNo })
			await this.query.insertQuery(category, tempBackup.map((x) => ({ ...x, profile_no: destProfileNo, uid: undefined })))
		}
	}

	async deleteProfile(profileNo) {
		if (!this.human) await this.init()

		await this.query.deleteQuery('profiles', {
			id: this.id,
			profile_no: profileNo,
		})

		if (this.profiles.length !== 1 || profileNo !== 1) {
			for (const category of this.categories) {
				await this.query.deleteQuery(category, {
					id: this.id,
					profile_no: profileNo,
				})
			}
		}

		if (this.human.current_profile_no === profileNo) {
			// Find lowest profile (or 1)

			let lowestProfileNo = 9999
			let lowestProfile
			for (const profile of this.profiles) {
				if (profile.profile_no < lowestProfileNo && profile.profile_no !== profileNo) {
					lowestProfileNo = profile.profile_no
					lowestProfile = profile
				}
			}
			if (!lowestProfile) {
				await this.query.updateQuery('humans', {
					current_profile_no: 1,
				}, { id: this.id })
			} else {
				await this.query.updateQuery('humans', {
					current_profile_no: lowestProfileNo,
					area: lowestProfile.area,
					latitude: lowestProfile.latitude,
					longitude: lowestProfile.longitude,
				}, { id: this.id })
			}
		}
	}
}

module.exports = ProfileLogic