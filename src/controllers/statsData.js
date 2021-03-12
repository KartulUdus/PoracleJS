/**
 * Class that holds stats data
 */
class StatsData {
	constructor(config, log) {
		this.config = config
		this.log = log
		this.rarityGroups = {}
	}

	/**
	 * Called on inbound stats broadcast from stats controller
	 * @param data
	 */
	receiveStatsBroadcast(data) {
		this.rarityGroups = data
	}
}

module.exports = StatsData