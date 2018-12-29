module.exports = function (fastify, opts, next) {

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
	next()
}