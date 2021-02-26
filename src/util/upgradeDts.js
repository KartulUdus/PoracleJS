const all = {
	staticmap: 'staticMap',
	applemap: 'appleMapUrl',
	mapurl: 'googleMapUrl',
	distime: 'disappearTime',
}

const monster = {
	formname: 'formName',
	boost: 'boostWeatherName',
	boostemoji: 'boostWeatherEmoji',
	gameweather: 'gameWeatherName',
	gameweatheremoji: 'gameWeatherEmoji',
	individual_atatack: 'atk',
	individual_defense: 'def',
	individual_stamina: 'sta',
	quickMove: 'quickMoveName',
	chargeMove: 'chargeMoveName',
	move1emoji: 'quickMoveEmoji',
	move2emoji: 'chargeMoveEmoji',
	ivcolor: 'ivColor',
	gif: '',
}

const quest = {
	conditionstring: '',
}

const raid = {
	color: 'gymColor',
	formname: 'formNameEng',
	evolutionname: 'formNameEng',
	gif: '',
	move1emoji: 'quickMoveEmoji',
	move2emoji: 'chargeMoveEmoji',
	quickMove: 'quickMoveName',
	chargeMove: 'chageMoveName',
}

const weather = {
	weather: 'weatherName',
	oldweather: 'oldWeatherName',
	oldweatheremoji: 'oldWeatherEmoji',
	weatheremoji: 'weatherEmoji',

}

function checkreplace(s, entry) {
	const replacement = entry[s]
	return replacement || s
}

const dts = require('../../config/dts.json')

// path.join(__dirname, '../../config/dts.json')
// {
// 	"id": 1,
// 	"language": "en",
// 	"type": "monster",
// 	"default": true,
// 	"platform": "discord",
// 	"template": {
// 	"embed": {
// 		"color": "{{ivColor}}",
// 			"title": "{{round iv}}% {{name}}{{#if form}}{{#isnt formName 'Normal'}} {{formName}}{{/isnt}}{{/if}} cp:{{cp}} L:{{level}} {{atk}}/{{def}}/{{sta}} {{boostWeatherEmoji}}",
// 			"description": "End: {{time}}, Time left: {{tthm}}m {{tths}}s \n {{#if weatherChange}}{{weatherChange}}\n{{/if}}{{addr}} \n quick: {{quickMoveName}}, charge: {{chargeMoveName}} \n {{#if pvp_rankings_great_league}}{{#compare bestGreatLeagueRank '<=' pvpDisplayMaxRank}}{{#compare bestGreatLeagueRankCP '>=' pvpDisplayGreatMinCP}}**Great league:**\n{{/compare}}{{/compare}}{{#each pvp_rankings_great_league}}{{#if this.rank}}{{#compare this.rank '<=' ../pvpDisplayMaxRank}}{{#compare this.cp '>=' ../pvpDisplayGreatMinCP}} - {{pokemonName this.pokemon}} #{{this.rank}} @{{this.cp}}CP (Lvl. {{this.level}})\n{{/compare}}{{/compare}}{{/if}}{{/each}}{{/if}}{{#if pvp_rankings_ultra_league}}{{#compare bestUltraLeagueRank '<=' pvpDisplayMaxRank}}{{#compare bestUltraLeagueRankCP '>=' pvpDisplayUltraMinCP}}**Ultra League:**\n{{/compare}}{{/compare}}{{#each pvp_rankings_ultra_league}}{{#if this.rank}}{{#compare this.rank '<=' ../pvpDisplayMaxRank}}{{#compare this.cp '>=' ../pvpDisplayUltraMinCP}} - {{pokemonName this.pokemon}} #{{this.rank}} @{{this.cp}}CP (Lvl. {{this.level}})\n{{/compare}}{{/compare}}{{/if}}{{/each}}{{/if}} Maps: [Google]({{{googleMapUrl}}}) | [Apple]({{{appleMapUrl}}})",
// 			"thumbnail": {
// 			"url": "{{{imgUrl}}}"
// 		}
// 	}
// }

function updateDtsString(test, fixes) {
	return test.replace(/{{([a-zA-Z0-9 #]*)}}/g,
		((x) => `{{${x.substring(2, x.length - 2).replace(/(\S+)/g, ((word) => checkreplace(checkreplace(word, fixes), all)))}}}`))
}

function fix(o, t) {
	if (!o) return

	for (const key of Object.keys(o)) {
		if (typeof o[key] === 'string') {
			o[key] = updateDtsString(o[key], t)
		} else if (Array.isArray(o[key])) {
			o[key].map((x) => fix(x, t))
		} else {
			fix(o[key], t)
		}
	}
}

for (const entry of dts) {
	let replacementType
	switch (entry.type) {
		case 'monsterNoIv':
		case 'monster':
			replacementType = monster
			break
		case 'invasion':
			replacementType = null
			break
		case 'quest':
			replacementType = quest
			break
		case 'raid':
		case 'egg':
			replacementType = raid
			break
		case 'weatherchange':
			replacementType = weather
			break
		default:
			replacementType = null
			break
	}
	if (replacementType) {
		fix(entry.template, replacementType)
	}
}

// eslint-disable-next-line no-console
console.log(JSON.stringify(dts, null, '  '))
