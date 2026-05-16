/**
 * Campfire Link Generator
 * Generates Niantic Campfire deep links for gyms/raids
 */

class CampfireLink {
	/**
	 * Generate a Campfire link from gym/raid data
	 * @param {Object} data - The gym/raid data from webhook
	 * @returns {string} Campfire deep link URL
	 */
	static generate(data) {
		const {
			latitude,
			longitude,
			gym_id: gymId,
			gymName,
			gymUrl,
		} = data

		// Use gym_id as marker, or generate one if missing
		const markerId = gymId || this._generateId()

		// Build the deep link data string
		const deepLinkData = `r=map&lat=${latitude}&lng=${longitude}&m=${markerId}&g=PGO`

		// Base64 encode it
		const encodedData = Buffer.from(deepLinkData).toString('base64')

		// URL encode the title and image
		const encodedTitle = encodeURIComponent(gymName || 'Gym')
		const encodedImage = encodeURIComponent(gymUrl || 'https://social.nianticlabs.com/images/gym-link-social-preview.png')

		// Build and return the complete URL
		return `https://campfire.onelink.me/eBr8?af_dp=campfire://&af_force_deeplink=true&deep_link_sub1=${encodedData}&af_og_title=${encodedTitle}&af_og_description=%20&af_og_image=${encodedImage}`
	}

	/**
	 * Generate a simple UUID if gym_id is missing
	 * @private
	 */
	static _generateId() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = Math.random() * 16 | 0
			const v = c === 'x' ? r : (r & 0x3 | 0x8)
			return v.toString(16)
		})
	}
}

module.exports = CampfireLink
