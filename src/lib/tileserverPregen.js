const axios = require('axios')

class TileserverPregen {
	constructor(config, log) {
		this.axios = axios
		this.log = log
		this.config = config
	}

	async getPregeneratedTileURL(logReference, type, data, staticMapType) {
		let mapType = 'staticmap'
		let templateType = ''
		if (staticMapType.toLowerCase() === 'multistaticmap') {
			mapType = 'multistaticmap'
			templateType = 'multi-'
		}
		const url = `${this.config.geocoding.staticProviderURL}/${mapType}/poracle-${templateType}${type}?pregenerate=true&regeneratable=true`
		try {
			this.log.debug(`${logReference}: Pre-generating static map ${url}`)
			const result = await axios.post(url, data)
			if (result.status !== 200) {
				this.log.warn(`${logReference}: Failed to Pregenerate ${templateType}StaticMap. Got ${result.status}. Error: ${result.data ? result.data.reason : '?'}.`)
				return null
			} if (typeof result.data !== 'string') {
				this.log.warn(`${logReference}: Failed to Pregenerate ${templateType}StaticMap. No id returned.`)
				return null
			}
			return result.data.startsWith('http') ? result.data : `${this.config.geocoding.staticProviderURL}/${mapType}/pregenerated/${result.data}`
		} catch (error) {
			if (error.response) {
				this.log.warn(`${logReference}: Failed to Pregenerate ${templateType}StaticMap. Got ${error.response.status}. Error: ${error.response.data ? error.response.data.reason : '?'}.`)
			} else {
				this.log.warn(`${logReference}: Failed to Pregenerate ${templateType}StaticMap. Error: ${error}.`)
			}
			return null
		}
	}

	// Inspiration from https://github.com/ccev/stscpy/blob/main/tileserver/staticmap.py#L138

	/**
	 * work out zoom and lat/lon for best tile
	 * @param shapes
	 */
	// eslint-disable-next-line class-methods-use-this
	autoposition(shapes, height, width, margin = 1.06, defaultZoom = 17.5) {
		function adjustLatitude(lat, distance) {
			const earth = 6378.137 // radius of the earth in kilometer
			const pi = Math.PI
			const m = (1 / ((2 * pi / 360) * earth)) / 1000 // 1 meter in degree

			return lat + (distance * m)
		}

		function adjustLongitude(lat, lon, distance) {
			const earth = 6378.137 // radius of the earth in kilometer
			const pi = Math.PI
			const { cos } = Math
			const m = (1 / ((2 * pi / 360) * earth)) / 1000 // 1 meter in degree

			return lon + (distance * m) / cos(lat * (pi / 180))
		}

		const objs = []
		if (shapes.circles) {
			shapes.circles.forEach((c) => {
				objs.push([adjustLatitude(c.latitude, -c.radiusM), c.longitude])
				objs.push([adjustLatitude(c.latitude, c.radiusM), c.longitude])

				objs.push([c.latitude, adjustLongitude(c.latitude, c.longitude, -c.radiusM)])
				objs.push([c.latitude, adjustLongitude(c.latitude, c.longitude, c.radiusM)])
			})
		}
		if (shapes.markers) {
			objs.push(...shapes.markers.map((x) => [x.latitude, x.longitude]))
		}
		if (shapes.polygons) {
			shapes.polygons.forEach((p) => {
				objs.push(...p.path)
			})
		}

		if (!objs.length) return

		const lats = objs.map(([lat]) => lat)
		const lons = objs.map(([, lon]) => lon)

		const minLat = Math.min(...lats)
		const maxLat = Math.max(...lats)
		const minLon = Math.min(...lons)
		const maxLon = Math.max(...lons)

		const ne = [maxLat * margin, maxLon * margin]
		const sw = [minLat * margin, minLon * margin]

		if (ne == sw) {
			return {
				zoom: defaultZoom,
				latitude: lats[0],
				longitude: lons[0],
			}
		}

		const latitude = minLat + ((maxLat - minLat) / 2.0)
		const longitude = minLon + ((maxLon - minLon) / 2.0)

		function latRad(lat) {
			const sin = Math.sin(lat * Math.PI / 180.0)
			const rad = Math.log((1.0 + sin) / (1.0 - sin)) / 2.0
			return Math.max(Math.min(rad, Math.PI), -Math.PI) / 2.0
		}

		function zoom(px, fraction) {
			return Math.round(Math.log2(px / 256.0 / fraction), 2.0)
		}

		const latFraction = (latRad(ne[0]) - latRad(sw[0])) / Math.PI
		let angle = ne[1] - sw[1]
		if (angle < 0.0) angle += 360.0
		const lonFraction = angle / 360.0
		return {
			zoom: Math.min(zoom(width, latFraction), zoom(height, lonFraction)),
			latitude,
			longitude,
		}
	}
}

module.exports = TileserverPregen
