// eslint-disable-next-line no-control-regex
module.exports = ((x) => x.replace(/[^\x00-\xFF]/g, '')
)