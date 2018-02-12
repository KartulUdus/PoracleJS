let log = require("../logger");
let config = require('config');
let inside = require('point-in-polygon');
let _ = require('lodash');
let NodeGeocoder = require('node-geocoder');

let geocoder = NodeGeocoder({
    provider: 'google',
    httpAdapter: 'https',
    apiKey: config.gmaps.key
});
let getCoords = NodeGeocoder({
    provider: 'google',
    httpAdapter: 'https',
    apiKey: config.gmaps.key
});

module.exports = {

    geolocate: function(location, callback) {
        getCoords.geocode(location, function(err, res) {
            if (err) log.error(err);
            log.info(`Figuring out where ${location} is`);
            callback(err, res[0]);
        });
    },

    getAddress: function(location, callback) {
        geocoder.reverse(location, function(err, data) {
            if (err) log.error(err);

			var res = {};
			if(data && data.length > 0) {
				//we found it
				res.addr = config.locale.addressformat
				.replace(/%n/, data[0].streetNumber)
				.replace(/%S/, data[0].streetName)
				.replace(/%z/, data[0].zipcode)
				.replace(/%P/, data[0].country)
				.replace(/%p/, data[0].countryCode)
				.replace(/%c/, data[0].city)
				.replace(/%T/, data[0].state)
				.replace(/%t/, data[0].stateCode);
				res.streetNumber = data[0].streetNumber;
				res.streetName = data[0].streetName;
				res.zipcode = data[0].zipcode;
				res.country = data[0].country;
				res.countryCode = data[0].countryCode;
				res.city = data[0].city;
				res.state = data[0].state;
				res.stateCode = data[0].stateCode;
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