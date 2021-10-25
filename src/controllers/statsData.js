/**
 * Class that holds stats data
 */
class StatsData {
	constructor(config, log) {
		this.config = config
		this.log = log
		this.rarityGroups = {}
		this.shinyData = {}
	}

	/**
	 * Called on inbound stats broadcast from stats controller
	 * @param data
	 */
	receiveStatsBroadcast(data) {
		this.rarityGroups = data.rarity
		this.shinyData = data.shiny
	}
}

module.exports = StatsData