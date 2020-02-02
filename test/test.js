const fs = require('fs')
const path = require('path')
const chai = require('chai')

const should = chai.should()

const client = require('./initCommands')
describe('Discord Event tests', () => {
	client.emit('message', {})
	it('', (done) => {
		'potato'.should.have.lengthOf(7)
		done()
	})

})


