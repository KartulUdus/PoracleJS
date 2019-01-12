module.exports = function schema(fastify, opts, next) {

	fastify
		.addSchema({
			$id: 'monsterMessage',
			type: 'object',
			required: ['encounter_id', 'pokemon_id', 'latitude', 'longitude', 'disappear_time'],
			properties: {
				encounter_id: { type: 'string' },
				pokemon_id: { type: 'integer' },
				latitude: { type: 'number' },
				longitude: { type: 'number' },
				disappear_time: { type: 'integer' }
			}
		})
		.addSchema({
			$id: 'raidMessage',
			type: 'object',
			required: ['gym_id', 'pokemon_id', 'latitude', 'longitude', 'start', 'end'],
			properties: {
				gym_id: { type: 'string' },
				pokemon_id: { type: 'integer' },
				latitude: { type: 'number' },
				longitude: { type: 'number' },
				start: { type: 'integer' },
				end: { type: 'integer' }
			}
		})
		.addSchema({
			$id: 'gym_detailsMessage',
			type: 'object',
			required: ['id', 'name', 'latitude', 'longitude', 'team'],
			properties: {
				id: { type: 'string' },
				name: { type: 'string' },
				team: { type: 'integer' },
				url: { type: 'string' },
				latitude: { type: 'number' },
				longitude: { type: 'number' }
			}
		})
		.addSchema({
			$id: 'questMessage',
			type: 'object',
			required: ['type', 'target', 'conditions', 'rewards', 'latitude', 'longitude', 'updated'],
			properties: {
				type: { type: 'integer' },
				target: { type: 'integer' },
				conditions: { type: 'array' },
				rewards: { type: 'array' },
				updated: { type: 'integer' },
				latitude: { type: 'number' },
				longitude: { type: 'number' }
			}
		})
		.addSchema({
			$id: 'pokestopMessage',
			type: 'object',
			required: ['pokestop_id', 'latitude', 'longitude', 'lure_expiration', 'name', 'url'],
			properties: {
				pokestop_id: { type: 'string' },
				latitude: { type: 'number' },
				longitude: { type: 'number' },
				lure_expiration: { type: 'number' },
				name: { type: 'string' },
				url: { type: 'string' }
			}
		})
	next()
}