function calculateLocationRestrictions(config, communityMembership) {
	const locationRestrictions = new Set()

	for (const community of communityMembership) {
		const communityName = Object.keys(config.areaSecurity.communities).find((x) => x.toLowerCase() == community)
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

function filterAreas(config, communityMembership, areas) {
	const allowedAreas = []

	for (const community of communityMembership) {
		const communityName = Object.keys(config.areaSecurity.communities).find((x) => x.toLowerCase() == community)
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
			.filter((x) => x != communityToRemove)
	}

	return newCommunities.filter((x) => lowercaseCommunities.includes(x)).sort()
}

module.exports = {
	calculateLocationRestrictions, addCommunity, removeCommunity, filterAreas,
}