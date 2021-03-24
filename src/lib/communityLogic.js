function calculateLocationRestrictions(config, communityMembership) {
	const locationRestrictions = []

	for (const community of communityMembership) {
		const communityToAdd = config.areaSecurity.communities.find((x) => x.toLowerCase() == community)
		if (communityToAdd) {
			locationRestrictions.push(...communityToAdd.locationFence.map((x) => x.toLowerCase()))
		}
	}

	return locationRestrictions
}

function addCommunity(config, existingCommunities, communityToAdd) {
	const communityKeys = Object.keys(config.areaSecurity.communities)
	const lowercaseCommunities = communityKeys.map((area) => area.toLowerCase())

	let newCommunities = existingCommunities
	if (!lowercaseCommunities.includes(communityToAdd)) {
		newCommunities = [...newCommunities, communityToAdd]
	}

	return newCommunities.filter((x) => lowercaseCommunities.includes(x))
}

function removeCommunity(config, existingCommunities, communityToRemove) {
	const communityKeys = Object.keys(config.areaSecurity.communities)
	const lowercaseCommunities = communityKeys.map((area) => area.toLowerCase())

	let newCommunities = existingCommunities
	if (lowercaseCommunities.includes(communityToRemove)) {
		newCommunities = existingCommunities
			.filter((x) => x != communityToRemove)
	}

	return newCommunities.filter((x) => lowercaseCommunities.includes(x))
}

exports.modules = { calculateLocationRestrictions, addCommunity, removeCommunity }