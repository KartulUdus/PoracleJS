/**
 * Class that holds stats data
 */
class StatsData {
	constructor(config, log) {
		this.config = config
		this.log = log
		this.statsData = {}
	}

	/**
	 * Called on inbound stats broadcast from stats controller
	 * @param data
	 */
	receiveStatsBroadcast(data) {
		this.statsData = data
	}
}

module.exports = StatsData