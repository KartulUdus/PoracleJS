/**
 * Calculate location restrictions based on community membership
 * @param config
 * @param communityMembership
 * @returns {any[]}
 */
function calculateLocationRestrictions(config, communityMembership) {
	const locationRestrictions = new Set()

	for (const community of communityMembership) {
		const communityName = Object.keys(config.areaSecurity.communities).find((x) => x.toLowerCase() === community)
		if (communityName) {
			const communityToAdd = config.areaSecurity.communities[communityName]
			if (communityToAdd) {
				if (Array.isArray(communityToAdd.locationFence)) {
					communityToAdd.locationFence.forEach((x) => locationRestrictions.add(x.toLowerCase()))
				} else {
					locationRestrictions.add(communityToAdd.locationFence.toLowerCase())
				}
			}
		}
	}

	return [...locationRestrictions]
}

/**
 * Filter area list based on community membership
 * @param config
 * @param communityMembership
 * @param areas
 * @returns {*}
 */
function filterAreas(config, communityMembership, areas) {
	const allowedAreas = []

	for (const community of communityMembership) {
		const communityName = Object.keys(config.areaSecurity.communities).find((x) => x.toLowerCase() === community)
		if (communityName) {
			const communityToAdd = config.areaSecurity.communities[communityName]
			if (communityToAdd) {
				communityToAdd.allowedAreas.map((x) => x.toLowerCase()).forEach((x) => {
					if (!allowedAreas.includes(x)) allowedAreas.push(x)
				})
			}
		}
	}

	return areas.filter((x) => allowedAreas.includes(x))
}

/**
 * Add community to community list, and validate communities
 * @param config
 * @param existingCommunities
 * @param communityToAdd
 * @returns {*[]}
 */
function addCommunity(config, existingCommunities, communityToAdd) {
	const lowercaseCommunityToAdd = communityToAdd.toLowerCase()
	const communityKeys = Object.keys(config.areaSecurity.communities)
	const lowercaseCommunities = communityKeys.map((area) => area.toLowerCase())

	let newCommunities = existingCommunities
	if (!newCommunities.includes(lowercaseCommunityToAdd)) {
		newCommunities = [...newCommunities, lowercaseCommunityToAdd]
	}

	return newCommunities.filter((x) => lowercaseCommunities.includes(x)).sort()
}

function removeCommunity(config, existingCommunities, communityToRemove) {
	const communityKeys = Object.keys(config.areaSecurity.communities)
	const lowercaseCommunities = communityKeys.map((area) => area.toLowerCase())

	let newCommunities = existingCommunities
	if (newCommunities.includes(communityToRemove)) {
		newCommunities = existingCommunities
			.filter((x) => x !== communityToRemove)
	}

	return newCommunities.filter((x) => lowercaseCommunities.includes(x)).sort()
}

/**
 * Determine whether given user id is a telegram community admin, and if so return community list
 * @param config
 * @param id
 * @returns {boolean|*[]}
 */
function isTelegramCommunityAdmin(config, id) {
	const communityList = []

	for (const [communityName, entry] of Object.entries(config.areaSecurity.communities)) {
		if (entry.telegram && entry.telegram.admins && entry.telegram.admins.includes(id.toString())) {
			communityList.push(communityName.toLowerCase())
		}
	}
	if (communityList.length) return communityList
	return false
}

module.exports = {
	calculateLocationRestrictions, addCommunity, removeCommunity, filterAreas, isTelegramCommunityAdmin,
}
