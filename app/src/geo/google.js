let log = require("../logger");
let config = require('config');
let inside = require('point-in-polygon');
let _ = require('lodash');
let NodeGeocoder = require('node-geocoder');
let pcache = require('persistent-cache');

let geocoder = NodeGeocoder({
    provider: 'google',
    httpAdapter: 'https',
    apiKey: config.gmaps.key
});

let opengeocoder = NodeGeocoder({
	provider: 'openstreetmap'
});

let addrCache = pcache({
    base: '.cache',
    name: 'addrCache',
    duration: 30 * 24 * 3600 * 1000 //30 days is what google allows
});

module.exports = {

    geolocate: function(location, callback) {
        geocoder.geocode(location, function(err, res) {
            if (err) log.error(err);
            log.info(`Figuring out where ${location} is`);
            if(!res){
            	opengeocoder.geocode(location, function(err, res){
                    if (err) log.error(err);
					callback(err, res)
				})
			} else  callback(err, res);
        });
    },

    getAddress: function(location, callback) {
        let cacheKey = `${location.lat}-${location.lon}`;
        addrCache.get(cacheKey, function(err, addr) {
            if(err) log.error(err);

            if(addr) {
                parseAddr(err, addr, callback);
                return;
            }

            geocoder.reverse(location, function(err, geocodeResult) {
                if (err) log.error(err);

                if(geocodeResult && geocodeResult.length > 0) {
                    addrCache.put(cacheKey, geocodeResult, function(err, r) {
                        if(err) log.error(`Error saving addr of ${cacheKey}: ${err}`)
                    });
                }
                parseAddr(err, geocodeResult ,callback);
            });
        });
    },

    pointInArea: function(point, callback){
        let confAreas = config.geofence.map(area => area.name.toLowerCase())
        let matchAreas = [];
        confAreas.forEach(function(area) {
            let areaObj = _.find(config.geofence, function(path){ return path.name.toLowerCase() === area });
            if(inside(point, areaObj.path)){
            matchAreas.push(area);
            }
        });
        callback(matchAreas);
    }
};

function parseAddr(err, geocodeResult, callback) {
    var res = {};
    if(geocodeResult && geocodeResult.length > 0) {
        //we found it
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
    } else {
        //didn't find anything, default it
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

    callback(err, res);
}
