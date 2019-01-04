const handler = require('../handlers/receiver')

const schema =
	{
		body: {
			type: 'array',
			items: {
				oneOf: [
					{
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: ['pokemon', 'Pokemon', 'POKEMON']
							},
							message: 'monsterMessage#'
						}
					},
					{
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: ['raid', 'Raid', 'RAID']
							},
							message: 'raidMessage#'
						}
					},
					{
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: ['gym_details', 'Gym_Details', 'Gym_details', 'GYM_DETAILS']
							},
							message: 'gym_detailsMessage#'
						}
					},
					{
						type: 'object',
						properties: {
							type: {
								type: 'string',
								enum: ['quest', 'Quest', 'QUEST']
							},
							message: 'questMessage#'
						}
					},

				]
			}
		}
	}


module.exports = function route(fastify, opts, next) {

	fastify.post('/', { schema }, handler)
	next()
}
