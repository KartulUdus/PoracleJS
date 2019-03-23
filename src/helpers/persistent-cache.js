const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')


function exists(dir) {
	try {
		fs.accessSync(dir)
	}
	catch (err) {
		return false
	}
	return true
}

function safeCb(cb) {
	if (typeof cb === 'function') {
		return cb
	}
	return function () {} // eslint-disable-line func-names
}

function cache(userOptions) {
	if (!fs.existsSync('.cache/')) {
		fs.mkdirSync('.cache/')
	}
	if (!fs.existsSync('.cache/cache')) {
		fs.mkdirSync('.cache/cache')
	}
	const options = userOptions || {}

	let memoryCache
	let data

	const base = path.normalize(`${options.base || (require.main ? path.dirname(require.main.filename) : undefined) || process.cwd()}/cache`)
	const cacheDir = path.normalize(`${base}/${options.name || 'cache'}`)
	const cacheInfinitely = !(typeof options.duration === 'number')
	const cacheDuration = options.duration
	const ram = typeof options.memory === 'boolean' ? options.memory : true
	const persist = typeof options.persist === 'boolean' ? options.persist : true

	if (ram) {
		memoryCache = {}
	}

	if (persist && !exists(cacheDir)) {
		fs.mkdirSync(cacheDir)
	}

	function buildFilePath(name) {
		return path.normalize(`${cacheDir}/${name}.json`)
	}

	function buildCacheEntry(data) { // eslint-disable-line no-shadow
		return {
			cacheUntil: !cacheInfinitely ? new Date().getTime() + cacheDuration : undefined,
			data,
		}
	}

	function put(name, data, cb) { // eslint-disable-line no-shadow
		const entry = buildCacheEntry(data)

		if (persist) {
			fs.writeFile(buildFilePath(name), JSON.stringify(entry), cb)
		}

		if (ram) {
			entry.data = JSON.stringify(entry.data)

			memoryCache[name] = entry

			if (!persist) {
				return safeCb(cb)(null)
			}
		}
	}

	function putSync(name, data) { // eslint-disable-line no-shadow
		const entry = buildCacheEntry(data)

		if (persist) {
			fs.writeFileSync(buildFilePath(name), JSON.stringify(entry))
		}

		if (ram) {
			memoryCache[name] = entry
			memoryCache[name].data = JSON.stringify(memoryCache[name].data)
		}
	}

	function get(name, cb) {
		if (ram && !!memoryCache[name]) {
			const entry = memoryCache[name]

			if (!!entry.cacheUntil && new Date().getTime() > entry.cacheUntil) {
				return safeCb(cb)(null, undefined)
			}

			return safeCb(cb)(null, JSON.parse(entry.data))
		}


		function onFileRead(err, content) {
			if (err != null) {
				return safeCb(cb)(null, undefined)
			}

			const entry = JSON.parse(content)

			if (!!entry.cacheUntil && new Date().getTime() > entry.cacheUntil) {
				return safeCb(cb)(null, undefined)
			}

			return safeCb(cb)(null, entry.data)
		}

		fs.readFile(buildFilePath(name), 'utf8', onFileRead)

	}

	function getSync(name) {
		if (ram && !!memoryCache[name]) {
			const entry = memoryCache[name]

			if (entry.cacheUntil && new Date().getTime() > entry.cacheUntil) {
				return undefined
			}

			return JSON.parse(entry.data)
		}

		try {
			data = JSON.parse(fs.readFileSync(buildFilePath(name), 'utf8'))
		}
		catch (e) {
			return undefined
		}

		if (data.cacheUntil && new Date().getTime() > data.cacheUntil) {
			return undefined
		}

		return data.data
	}

	function deleteEntry(name, cb) {
		if (ram) {
			delete memoryCache[name]

			if (!persist) {
				safeCb(cb)(null)
			}
		}

		fs.unlink(buildFilePath(name), cb)
	}

	function deleteEntrySync(name) {
		if (ram) {
			delete memoryCache[name]

			if (!persist) {
				return
			}
		}

		fs.unlinkSync(buildFilePath(name))
	}

	function unlink(cb) {
		if (persist) {
			return exec(`rm -r ${cacheDir}`, (err, stdout, stderr) => {
				safeCb(cb)
			})
		}

		safeCb(cb)(null)
	}

	function transformFileNameToKey(fileName) {
		return fileName.slice(0, -5)
	}

	function keys(cb) {
		cb = safeCb(cb)

		if (ram && !persist) {
			return cb(null, Object.keys(memoryCache))
		}

		function onDirRead(err, files) {
			return err ? cb(err) : cb(err, files.map(transformFileNameToKey))
		}

		fs.readdir(cacheDir, onDirRead)
	}

	function keysSync() {
		if (ram && !persist) {
			return Object.keys(memoryCache)
		}

		return fs.readdirSync(cacheDir).map(transformFileNameToKey)
	}

	return {
		put,
		get,
		delete: deleteEntry,

		putSync,
		getSync,
		deleteSync: deleteEntrySync,

		keys,
		keysSync,

		unlink,
	}
}

module.exports = cache
