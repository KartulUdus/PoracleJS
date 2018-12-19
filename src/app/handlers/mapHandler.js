


module.exports =  async (req, reply) => {

	console.log(req.query.lat, req.query)
	reply.view('src/app/util/static/map.html', {lat: req.query.lat, lon: req.query.lon})
}