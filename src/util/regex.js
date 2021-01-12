// eslint-disable-next-line func-names
const createCommandRegex = function (translatorFactory, commandName, paramMatch, flags = 'i') {
	const translatedCommands = translatorFactory.translateCommand(commandName)
	let expr = `^(${commandName}`
	for (const translatedCommand of translatedCommands) {
		if (translatedCommand !== commandName) {
			expr += `|${translatedCommand}`
		}
	}
	expr += `)(${paramMatch})$`

	return new RegExp(expr, flags)
}

module.exports = (translatorFactory) => ({
	nameRe: createCommandRegex(translatorFactory, 'name', '\\S+'),
	userRe: createCommandRegex(translatorFactory, 'user', '\\S+'),
	formRe: createCommandRegex(translatorFactory, 'form', '\\S+'),
	genRe: createCommandRegex(translatorFactory, 'gen', '[1-7]+'),
	maxlevelRe: createCommandRegex(translatorFactory, 'maxlevel', '\\d{1,2}'),
	templateRe: createCommandRegex(translatorFactory, 'template', '\\S+'),
	maxcpRe: createCommandRegex(translatorFactory, 'maxcp', '\\d{1,5}'),
	maxivRe: createCommandRegex(translatorFactory, 'maxiv', '\\d{1,3}'),
	maxweightRe: createCommandRegex(translatorFactory, 'maxweight', '\\d{1,6}'),
	maxatkRe: createCommandRegex(translatorFactory, 'maxatk', '\\d{1,2}'),
	maxdefRe: createCommandRegex(translatorFactory, 'maxdef', '\\d{1,2}'),
	maxstaRe: createCommandRegex(translatorFactory, 'maxsta', '\\d{1,2}'),
	cpRe: createCommandRegex(translatorFactory, 'cp', '\\d{1,5}'),
	levelRe: createCommandRegex(translatorFactory, 'level', '\\d{1,2}'),
	ivRe: createCommandRegex(translatorFactory, 'iv', '\\d{1,3}'),
	atkRe: createCommandRegex(translatorFactory, 'atk', '\\d{1,2}'),
	defRe: createCommandRegex(translatorFactory, 'def', '\\d{1,2}'),
	staRe: createCommandRegex(translatorFactory, 'sta', '\\d{1,2}'),
	weightRe: createCommandRegex(translatorFactory, 'weight', '\\d{1,8}'),
	greatLeagueRe: createCommandRegex(translatorFactory, 'great', '\\d{1,4}'),
	greatLeagueCPRe: createCommandRegex(translatorFactory, 'greatcp', '\\d{1,5}'),
	ultraLeagueRe: createCommandRegex(translatorFactory, 'ultra', '\\d{1,4}'),
	ultraLeagueCPRe: createCommandRegex(translatorFactory, 'ultracp', '\\d{1,5}'),
	dRe: createCommandRegex(translatorFactory, 'd', '[\\d.]{1,}'),
	stardustRe: createCommandRegex(translatorFactory, 'stardust', '\\d{1,8}'),
	energyRe: createCommandRegex(translatorFactory, 'energy', '\\S+'),
	channelRe: createCommandRegex(translatorFactory, 'channel', '\\d{1,20}'),
}
)
