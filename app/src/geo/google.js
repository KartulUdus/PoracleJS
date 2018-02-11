let log = require("../logger");
let config = require('config');
let inside = require('point-in-polygon');
let _ = require('lodash');
let NodeGeocoder = require('node-geocoder');
let geocoder = NodeGeocoder({
    provider: 'google',
    httpAdapter: 'https',
    apiKey: config.gmaps.key,
    formatter: 'string',
    formatterPattern: config.locale.addressformat
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
        geocoder.reverse(location, function(err, res) {
            if (err) log.error(err);
            log.debug(`Fetched address ${res[0]}`);
            callback(res[0]);
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