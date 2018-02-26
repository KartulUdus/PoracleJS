const log = require('../logger');
const config = require('config');
const inside = require('point-in-polygon');
const _ = require('lodash');
const NodeGeocoder = require('node-geocoder');
const pcache = require('persistent-cache');

const geocoder = NodeGeocoder({
	provider: 'google',
	httpAdapter: 'https',
	apiKey: config.gmaps.key,
});

const opengeocoder = NodeGeocoder({
	provider: 'openstreetmap',
});

const addrCache = pcache({
	base: '.cache',
	name: 'addrCache',
	duration: 30 * 24 * 3600 * 1000, // 30 days is what google allows
});

function parseAddr(err, geocodeResult, callback) {
	const res = {};
	if (geocodeResult && geocodeResult.length > 0) {
		// we found it
		res.addr = config.locale.addressformat
			.replace(/%n/, geocodeResult[0].streetNumber || '')
			.replace(/%S/, geocodeResult[0].streetName || '')
			.replace(/%z/, geocodeResult[0].zipcode || '')
			.replace(/%P/, geocodeResult[0].country || '')
			.replace(/%p/, geocodeResult[0].countryCode || '')
			.replace(/%c/, geocodeResult[0].city || '')
			.replace(/%T/, geocodeResult[0].state || '')
			.replace(/%t/, geocodeResult[0].stateCode || '');
		res.streetNumber = geocodeResult[0].streetNumber || '';
		res.streetName = geocodeResult[0].streetName || '';
		res.zipcode = geocodeResult[0].zipcode || '';
		res.country = geocodeResult[0].country || '';
		res.countryCode = geocodeResult[0].countryCode || '';
		res.city = geocodeResult[0].city || '';
		res.state = geocodeResult[0].state || '';
		res.stateCode = geocodeResult[0].stateCode || '';
	}
	else {
		// didn't find anything, default it
		res.addr = '';
		res.streetNumber = '';
		res.streetName = '';
		res.zipcode = '';
		res.country = '';
		res.countryCode = '';
		res.city = '';
		res.state = '';
		res.stateCode = '';
	}

	return callback(err, res);
}

function geolocate(location, callback) {
	geocoder.geocode(location, (err, res) => {
		if (err) log.error(err);
		log.info(`Figuring out where ${location} is`);
		if (res) {
			return callback(err, res);
		}
		opengeocoder.geocode(location, (erro, resp) => {
			if (erro) log.error(erro);
			return callback(erro, resp);
		});
	});
}

function getAddress(location, callback) {
	const cacheKey = `${location.lat}-${location.lon}`;
	addrCache.get(cacheKey, (err, addr) => {
		if (err) log.error(err);
		if (addr) {
			parseAddr(err, addr, callback);
			return;
		}

		geocoder.reverse(location, (erro, geocodeResult) => {
			if (erro) log.error(erro);
			if (geocodeResult && geocodeResult.length > 0) {
				addrCache.put(cacheKey, geocodeResult, (error, r) => {
					if (error) log.error(`Error saving addr of ${cacheKey}: ${error}`);
				});
			}
			parseAddr(err, geocodeResult, callback);
		});
	});
}

function pointInArea(point, callback) {
	const confAreas = config.geofence.map(area => area.name.toLowerCase());
	const matchAreas = [];
	confAreas.forEach((area) => {
		const areaObj = _.find(config.geofence, path => path.name.toLowerCase() === area);
		if (inside(point, areaObj.path)) {
			matchAreas.push(area);
		}
	});
	callback(matchAreas);
}


module.exports = {
	geolocate,
	getAddress,
	pointInArea,
};