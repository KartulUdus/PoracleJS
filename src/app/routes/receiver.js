const schema =
	{
		body: {
			type: 'array',
			items: {
				oneOf: [
					{
						type : 'object',
						properties : {
							type: {
								type: 'string',
								enum: ['pokemon', 'Pokemon', 'POKEMON']
							},
							message: 'monsterMessage#'
						}
					},
					{
						type : 'object',
						properties : {
							type: {
								type: 'string',
								enum: ['raid', 'Raid', 'RAID']
							},
							message: 'raidMessage#'
						}
					},
					{
						type : 'object',
						properties : {
							type: {
								type: 'string',
								enum: ['gym_details', 'Gym_Details', 'Gym_details', 'GYM_DETAILS']
							},
							message: 'gym_detailsMessage#'
						}
					},

				]
			}
		}
	}


module.exports = function (fastify, opts, next) {

	fastify.post('/', { schema }, require('../handlers/receiver'))

	next()
}
