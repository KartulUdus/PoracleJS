function calculateLocationRestrictions(config, communityMembership) {
	const locationRestrictions = []

	for (const community of communityMembership) {
		const communityName = Object.keys(config.areaSecurity.communities).find((x) => x.toLowerCase() == community)
		if (communityName) {
			const communityToAdd = config.areaSecurity.communities[communityName]
			if (communityToAdd) {
				// locationRestrictions.push(...communityToAdd.locationFence.map((x) => x.toLowerCase()))
				const fence = communityToAdd.locationFence ? communityToAdd.locationFence.toLowerCase() : null
				if (fence && !locationRestrictions.includes(fence)) {
					locationRestrictions.push(communityToAdd.locationFence.toLowerCase())
				}
			}
		}
	}

	return locationRestrictions
}

function addCommunity(config, existingCommunities, communityToAdd) {
	const communityKeys = Object.keys(config.areaSecurity.communities)
	const lowercaseCommunities = communityKeys.map((area) => area.toLowerCase())

	let newCommunities = existingCommunities
	if (!newCommunities.includes(communityToAdd)) {
		newCommunities = [...newCommunities, communityToAdd]
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

module.exports = { calculateLocationRestrictions, addCommunity, removeCommunity }