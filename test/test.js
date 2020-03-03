const fs = require('fs')
const Mocha = require('mocha')
const { promisify } = require('util')
const { resolve } = require('path')
const config = require('config')
const { log } = require('./../src/lib/logger')

const mocha = new Mocha()
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

// Load all js files recursively in __dirname + /tests/
async function getFiles(dir) {
	const subdirs = await readdir(dir)
	const files = await Promise.all(subdirs.map(async (subdir) => {
		const res = resolve(dir, subdir)
		return (await stat(res)).isDirectory() ? getFiles(res) : res
	}))
	return files.reduce((a, f) => a.concat(f), [])
}

async function run() {
	if (config.general.environment.toLowerCase() === 'production') {
		log.info('Tests should not be run in Production mode, it affects your configured database')
		log.info('If you know what you are doing, set config.general.environment to "Test" first')
		process.exit()
	}
	const tests = await getFiles(`${__dirname}/tests`)
	tests.filter((file) => file.substr(-3) === '.js').forEach((filePath) => mocha.addFile(filePath))
	mocha.run((failures) => {
		process.exitCode = failures ? 1 : 0
		process.exit()
	})
}

run()
