/* eslint-disable max-classes-per-file */
const NodeGeocoder = require('node-geocoder')
const pcache = require('flat-cache')
const { performance } = require('perf_hooks')
const emojiFlags = require('country-code-emoji')
const path = require('path')
const NominatimGeocoder = require('./nominatimGeocoder')

class NominatimGeocoderConverter extends NominatimGeocoder {
	async reverse(obj) {
		const result = await super.reverse(obj.lat, obj.lon)

		if (!result) return null
		if (result.error) return result

		let countryCode = result.address.country_code
		if (countryCode) {
			countryCode = countryCode.toUpperCase()
		}

		let latitude = result.lat
		if (latitude) {
			latitude = parseFloat(latitude)
		}

		let longitude = result.lon
		if (longitude) {
			longitude = parseFloat(longitude)
		}

		return [{
			latitude,
			longitude,
			formattedAddress: result.display_name,
			country: result.address.country,
			city: result.address.city || result.address.town || result.address.village || result.address.hamlet,
			state: result.address.state,
			zipcode: result.address.postcode,
			streetName: result.address.road || result.address.cycleway,
			streetNumber: result.address.house_number,
			countryCode,
			neighbourhood: result.address.neighbourhood || '',
			suburb: result.address.suburb || '',
			town: result.address.town || '',
			village: result.address.village || '',
		}]
	}
}

class CachingGeocoder {
	constructor(config, log, mustache, cacheFilename) {
		this.log = log || console
		this.config = config
		this.mustache = mustache
		this.cache = cacheFilename ? pcache.load(cacheFilename, path.join(__dirname, '../../.cache')) : null
		this.timeout = this.config.tuning.geocodingTimeout || 5000
		setInterval(() => this.writeCache(), 60000) // Write out cache every minute
	}

	writeCache() {
		if (this.dirty) {
			try {
				this.dirty = false
				this.cache.save(true)
			} catch (err) {
				this.log.error('Writing geoCache failed', err)
			}
		}
	}

	getGeocoder() {
		switch (this.config.geocoding.provider.toLowerCase()) {
			case 'nominatim': {
				return new NominatimGeocoderConverter(this.config.geocoding.providerURL, this.timeout)
			}
			case 'google': {
				return NodeGeocoder({
					provider: 'google',
					httpAdapter: 'https',
					apiKey: this.config.geocoding.geocodingKey[Math.floor(Math.random() * this.config.geocoding.geocodingKey.length)],
					timeout: this.timeout,
				})
			}
			default:
			{
				return NodeGeocoder({
					provider: 'openstreetmap',
					formatterPattern: this.config.locale.addressFormat,
					timeout: this.timeout,
				})
			}
		}
	}

	async getAddress(locationObject) {
		if (this.config.geocoding.provider.toLowerCase() === 'none') {
			return { addr: 'Unknown', flag: '' }
		}

		if (this.config.geocoding.forwardOnly) {
			return { addr: 'Unknown', flag: '' }
		}

		const doGeolocate = async () => {
			try {
				const startTime = performance.now()
				const geocoder = this.getGeocoder()
				const r = await geocoder.reverse(locationObject)
				if (!r || r.error) {
					this.log.error(`getAddress: failed to fetch data - ${!r ? 'no result' : `${r.error}`}`)
					return { addr: 'Unknown', flag: '' }
				}

				const result = r[0]
				const endTime = performance.now();
				(this.config.logger.timingStats ? this.log.verbose : this.log.debug)(`Geocode ${locationObject.lat},${locationObject.lon} (${endTime - startTime} ms)`)

				const flag = emojiFlags.countryCodeEmoji(result.countryCode)
				if (!this.addressDts) {
					this.addressDts = this.mustache.compile(this.config.locale.addressFormat)
				}
				result.addr = this.addressDts(result)
				result.flag = flag || ''

				return this.escapeAddress(result)
			} catch (err) {
				this.log.error('getAddress: failed to fetch data', err)
				return { addr: 'Unknown', flag: '' }
			}
		}

		if (this.config.geocoding.cacheDetail === 0) {
			return doGeolocate()
		}

		const cacheKey = `${String(+locationObject.lat.toFixed(this.config.geocoding.cacheDetail))}-${String(+locationObject.lon.toFixed(this.config.geocoding.cacheDetail))}`
		const cachedResult = this.cache ? this.cache.getKey(cacheKey) : null
		if (cachedResult) return this.escapeAddress(cachedResult)

		const result = await doGeolocate()
		if (this.cache) {
			this.cache.setKey(cacheKey, result)
			this.dirty = true
		}

		return result
	}

	// eslint-disable-next-line class-methods-use-this
	escapeJsonString(s) {
		if (!s) return s
		return s.replace(/"/g, '\'\'').replace(/\n/g, ' ').replace(/\\/g, '?')
	}

	escapeAddress(a) {
		a.streetName = this.escapeJsonString(a.streetName)
		a.addr = this.escapeJsonString(a.addr)
		return a
	}
}

module.exports = CachingGeocoder