function createCommandRegex(translatorFactory, commandName, paramMatch, flags = 'i') {
	const translatedCommands = translatorFactory.translateCommand(commandName)
	// sort longest name first to avoid matching partials
	translatedCommands.sort((a, b) => b.length - a.length)
	// ASC  -> a.length - b.length
	// DESC -> b.length - a.length

	let first = true
	let expr = '^('
	for (const translatedCommand of translatedCommands) {
		if (first) {
			first = false
		} else {
			expr += '|'
		}

		expr += translatedCommand
	}
	expr += `):?(${paramMatch})`

	return new RegExp(expr, flags)
}

module.exports = (translatorFactory) => ({
	nameRe: createCommandRegex(translatorFactory, 'name', '\\S+'),
	userRe: createCommandRegex(translatorFactory, 'user', '-?\\d{1,20}'),
	formRe: createCommandRegex(translatorFactory, 'form', '.+'),
	moveRe: createCommandRegex(translatorFactory, 'move', '.+'),
	genRe: createCommandRegex(translatorFactory, 'gen', '[1-8]+'),
	maxlevelRe: createCommandRegex(translatorFactory, 'maxlevel', '\\d{1,2}'),
	templateRe: createCommandRegex(translatorFactory, 'template', '.+'),
	maxcpRe: createCommandRegex(translatorFactory, 'maxcp', '\\d{1,5}'),
	maxivRe: createCommandRegex(translatorFactory, 'maxiv', '\\d{1,3}'),
	maxweightRe: createCommandRegex(translatorFactory, 'maxweight', '\\d{1,6}'),
	maxRarityRe: createCommandRegex(translatorFactory, 'maxrarity', '.+'),
	maxatkRe: createCommandRegex(translatorFactory, 'maxatk', '\\d{1,2}'),
	maxdefRe: createCommandRegex(translatorFactory, 'maxdef', '\\d{1,2}'),
	maxstaRe: createCommandRegex(translatorFactory, 'maxsta', '\\d{1,2}'),
	cpRe: createCommandRegex(translatorFactory, 'cp', '(?<min>[0-9]{1,5})(\\-(?<max>[0-9]{1,5}))?'),
	levelRe: createCommandRegex(translatorFactory, 'level', '(?<min>[0-9]{1,2})(\\-(?<max>[0-9]{1,2}))?'),
	ivRe: createCommandRegex(translatorFactory, 'iv', '(?<min>[0-9]{1,3})(\\-(?<max>[0-9]{1,3}))?'),
	atkRe: createCommandRegex(translatorFactory, 'atk', '(?<min>[0-9]{1,2})(\\-(?<max>[0-9]{1,2}))?'),
	defRe: createCommandRegex(translatorFactory, 'def', '(?<min>[0-9]{1,2})(\\-(?<max>[0-9]{1,2}))?'),
	staRe: createCommandRegex(translatorFactory, 'sta', '(?<min>[0-9]{1,2})(\\-(?<max>[0-9]{1,2}))?'),
	weightRe: createCommandRegex(translatorFactory, 'weight', '(?<min>[0-9]{1,8})(\\-(?<max>[0-9]{1,8}))?'),
	rarityRe: createCommandRegex(translatorFactory, 'rarity', '.+'),
	sizeRe: createCommandRegex(translatorFactory, 'size', '(?<min>[0-9a-zA-Z]{1,3})(\\-(?<max>[0-9a-zA-Z]{1,3}))?'),
	maxSizeRe: createCommandRegex(translatorFactory, 'size', '[0-9a-zA-Z]{1,3}'),

	greatLeagueRe: createCommandRegex(translatorFactory, 'great', '(?<first>[0-9]{1,4})(\\-(?<second>[0-9]{1,4}))?'),
	greatLeagueHighestRe: createCommandRegex(translatorFactory, 'greathigh', '\\d{1,4}'),
	greatLeagueCPRe: createCommandRegex(translatorFactory, 'greatcp', '\\d{1,5}'),
	ultraLeagueRe: createCommandRegex(translatorFactory, 'ultra', '(?<first>[0-9]{1,4})(\\-(?<second>[0-9]{1,4}))?'),
	ultraLeagueHighestRe: createCommandRegex(translatorFactory, 'ultrahigh', '\\d{1,4}'),
	ultraLeagueCPRe: createCommandRegex(translatorFactory, 'ultracp', '\\d{1,5}'),
	littleLeagueRe: createCommandRegex(translatorFactory, 'little', '(?<first>[0-9]{1,4})(\\-(?<second>[0-9]{1,4}))?'),
	littleLeagueHighestRe: createCommandRegex(translatorFactory, 'littlehigh', '\\d{1,4}'),
	littleLeagueCPRe: createCommandRegex(translatorFactory, 'littlecp', '\\d{1,5}'),

	capRe: createCommandRegex(translatorFactory, 'cap', '\\d{1,4}'),
	dRe: createCommandRegex(translatorFactory, 'd', '[\\d.]{1,}'),
	tRe: createCommandRegex(translatorFactory, 't', '\\d{1,4}'),
	stardustRe: createCommandRegex(translatorFactory, 'stardust', '\\d{1,8}'),
	energyRe: createCommandRegex(translatorFactory, 'energy', '\\S+'),
	candyRe: createCommandRegex(translatorFactory, 'candy', '\\S+'),
	channelRe: createCommandRegex(translatorFactory, 'channel', '\\d{1,20}'),
	guildRe: createCommandRegex(translatorFactory, 'guild', '\\d{1,20}'),
	areaRe: createCommandRegex(translatorFactory, 'area', '.+'),
	languageRe: createCommandRegex(translatorFactory, 'language', '.+'),
	monRe: createCommandRegex(translatorFactory, 'mon', '(\\d\\d?)?(:?)(\\d\\d?)?'),
	tueRe: createCommandRegex(translatorFactory, 'tue', '(\\d\\d?)?(:?)(\\d\\d?)?'),
	wedRe: createCommandRegex(translatorFactory, 'wed', '(\\d\\d?)?(:?)(\\d\\d?)?'),
	thuRe: createCommandRegex(translatorFactory, 'thu', '(\\d\\d?)?(:?)(\\d\\d?)?'),
	friRe: createCommandRegex(translatorFactory, 'fri', '(\\d\\d?)?(:?)(\\d\\d?)?'),
	satRe: createCommandRegex(translatorFactory, 'sat', '(\\d\\d?)?(:?)(\\d\\d?)?'),
	sunRe: createCommandRegex(translatorFactory, 'sun', '(\\d\\d?)?(:?)(\\d\\d?)?'),
	weekdayRe: createCommandRegex(translatorFactory, 'weekday', '(\\d\\d?)?(:?)(\\d\\d?)?'),
	weekendRe: createCommandRegex(translatorFactory, 'weekend', '(\\d\\d?)?(:?)(\\d\\d?)?'),
	minspawnRe: createCommandRegex(translatorFactory, 'minspawn', '(\\d\\d?)?(:?)(\\d\\d?)?'),

	latlonRe: '^([-+]?(?:[1-8]?\\d(?:\\.\\d+)?|90(?:\\.0+)?)),\\s*([-+]?(?:180(\\.0+)?|(?:(?:1[0-7]\\d)|(?:[1-9]?\\d))(?:\\.\\d+)?))$',
}
)
