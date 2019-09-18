   # Custom Messages

#### dts.json

All alarm messages can be customized via the `./config/dts.json` file.  

A useful visualizer can be found [HERE](https://leovoel.github.io/embed-visualizer/) 

These are separated by the type of alarm [monster, monsterNoIv, raid, egg, quest].

Each of these categories has 5 default templates (by versbosity of alarm) with default alarm being "3" for each type.  

Sometimes it's necessary to use three curly braces on each side. This avoids url encoding for fields that need an url.  

###### Monster alarms

```json
  "monster": {
  "3":{
      "embed": {
        "title": "a wild {{{name}}} has appeared!",
        "description": "It weighs {{weight}}kg and will despawn at {{time}}, you have {{tthm}}m {{tths}}s left \nPerfection: **{{iv}}%** , ({{atk}}/{{def}}/{{sta}}) \n{{move1}}|{{move2}} Level:{{level}} (cp:**{{cp}}**)\naddress: {{addr}} ",
        "url": "{{{rocketmap}}}",
        "color": "{{color}}",
        "thumbnail": {
          "url": "{{{imgurl}}}"
        },
        "image": {
          "url": "{{{staticmap}}}"
        },
        "author": {
          "name": "{{name}}",
          "url": "{{{rocketmap}}}"
        }
      }
    }
  }

```

For monsters without IV information, you can specify a different message.

```json
  "monsterNoIv": {
    "1": {
      "embed": {
        "color": "{{color}}",
        "author": {
          "name":"#{{id}} {{name}} end: {{time}}, time left: {{tthm}}m {{tths}}s {{flagemoji}} {{lat}}, {{lon}} {{addr}}",
          "icon_url": "{{{imgurl}}}"
        },
        "description": "\n{{{emojistring}}}  [Google Maps]({{{mapurl}}}) [Apple Maps]({{{applemap}}})"
      }
    },
```


Any of the fields can be customized with the following:

| Option        | Value         | 
| --------------- |:-------------:|
|{{id}}| Pokemon Id|
|{{name}}| Monsters name|
|{{time}}| Disappear time|
|{{tthh}}| Full hours until hidden|
|{{tthm}}| Full minutes until hidden|
|{{tths}}| Full seconds until hidden|
|{{#confirmedTime}}True{{/confirmedTime}}| prints "True" if disappear timestamp is verifyed (based on RDM webhooks)|
|{{now}}| Current Timestamp|
|{{lat}}| Latitude of the alerted location|
|{{lon}}| Longitude of the alerted location|
|{{addr}}| Address of the alerted location|
|{{streetNumber}}| Street number of the alerted location|
|{{streetName}}| Street name of the alerted location|
|{{zipcode}}| Zip code of the alerted location|
|{{country}}| Country of the alerted location|
|{{countryCode}}| 2 letter country code of the alerted location|
|{{city}}| City name of the alerted location|
|{{state}}| State name of the alerted location|
|{{stateCode}}| 2 letter state code of the alerted location|
|{{neighbourhood}}| Neighbourhood of the alerted location|
|{{move1}}| Monsers quick move|
|{{move2}}| Monsters charge move|
|{{move1emoji}}| Monsers quick move type emoji|
|{{move2emoji}}| Monsters charge move type emoji|
|{{iv}}| Monsters Individual Value Precentage|
|{{cp}}| Monsters CP|
|{{gendername}}| Monsters gender|
|{{weight}}| Monsters weight|
|{{level}}| Monsters level|
|{{atk}}| Monsters attack|
|{{def}}| Monsters defense|
|{{sta}}| Monsters stamina|
|{{weight}}| Monsters weight in kilograms|
|{{{staticmap}}}| Static link to map|
|{{{mapurl}}}|Link to google maps search of the location|
|{{{imgurl}}}| Link to monsters picture|
|{{formname}}| Monsters form|
|{{color}}| Color to be used for embed (Color of monsters primary type)|
|{{ivcolor}}| Color to be used for embed (Color of monsters perfection based on config.discord.iv_colors)|
|{{boost}}| Monsters weather boost name|
|{{boostemoji}}| Monsters weather boost emoji)|
|{{gif}}| Gif image using pokemon-gif|
|{{{pokemoji}}}| Custom Emoji of the pokemon if defined in config/emoji.json|
|{{flagemoji}}|Country flag emoji for location|
|{{lat}}| Latitude of the alert|
|{{lon}}| Longitude of the alert|
|{{areas}}| Matched geofence area names for alert|


###### Raid alarms

```json
  
  "raid": {
    "1": {
      "embed": {
        "color": "{{color}}",
        "author": {
          "name": "R{{level}} {{name}} {{flagemoji}} {{lat}}, {{lon}} end: {{time}}, {{tthm}}m {{tths}}s",
          "url": "{{{mapurl}}}",
          "icon_url": "{{{imgurl}}}"
        }
      }
    },
```

| Option        | Value         | 
| --------------- |:-------------:|
|{{id}}| Pokémon id|
|{{name}}| Monsters name|
|{{time}}| Disappear time|
|{{tthh}}| Full hours until raid ends|
|{{tthm}}| Full minutes until raid ends|
|{{tths}}| Full seconds until raid ends|
|{{now}}| Current Timestamp|
|{{lat}}| Latitude of the alerted location|
|{{lon}}| Longitude of the alerted location|
|{{addr}}| Address of the alerted location|
|{{streetNumber}}| Street number of the alerted location|
|{{streetName}}| Street name of the alerted location|
|{{zipcode}}| Zip code of the alerted location|
|{{country}}| Country of the alerted location|
|{{countryCode}}| 2 letter country code of the alerted location|
|{{city}}| City name of the alerted location|
|{{state}}| State name of the alerted location|
|{{stateCode}}| 2 letter state code of the alerted location|
|{{neighbourhood}}| Neighbourhood of the alerted location|
|{{move1}}| Monsters quick move|
|{{move2}}| Monsters charge move|
|{{move1emoji}}| Monsters quick move type emoji|
|{{move2emoji}}| Monsters charge move type emoji|
|{{cp}}| Raid boss cp|
|{{cp20}}| Monsters cp with 100% perfect IV and level 20|
|{{cp25}}| Monsters cp with 100% perfect IV and level 25|
|{{mincp20}}| Monsters cp with 0% perfect IV and level 20|
|{{mincp20}}| Monsters cp with 0% perfect IV and level 25|
|{{level}}| Raid level|
|{{gymname}}| Name of the gym|
|{{teamname}}| Team owner of the gym
|{{description}}| Description of the gym|
|{{{detailsurl}}}| Descriptive picture url|
|{{{staticmap}}}| Static link to map|
|{{{mapurl}}}|Link to google maps search of the location|
|{{{imgurl}}}| Link to monsters picture|
|{{color}}| Color to be used for embed (Color of monsters primary type)|
|{{ex}}| If raid takes place in a potential EX gym (empty string if false)|
|{{#ex}}True{{/ex}}{{^ex}}False{{/ex}}| Prints True if ex eligible, False if not|
|{{gif}}| Gif image using pokemon-gif|
|{{flagemoji}}|Country flag emoji for location|
|{{{pokemoji}}}|Custom emoji for the award pokemon as set in config/emoji.json|
|{{lat}}| Latitude of the alert|
|{{lon}}| Longitude of the alert|
|{{areas}}| Matched geofence area names for alert|


###### Egg alarms

```json
  "egg":{
    "2": {
      "embed": {
        "title": "{{gymname}}: {{ex}}, \n {{countryCode}} {{flagemoji}} {{addr}} {{lat}}, {{lon}} )",
        "description": "[Google Maps]({{{mapurl}}}) [Apple Maps]({{{applemap}}})",
        "color": "{{color}}",
        "thumbnail": {
          "url": "{{{detailsurl}}}"
        },
        "author": {
          "name": "lvl{{level}} hatch: {{time}} in {{tthm}}m {{tths}}s",
          "icon_url": "{{{imgurl}}}"
        }
      }
    },
```



| Option        | Value         | 
| --------------- |:-------------:|
|{{time}}| Disappear time|
|{{tthh}}| Full hours until raid ends|
|{{tthm}}| Full minutes until raid ends|
|{{tths}}| Full seconds until raid ends|
|{{now}}| Current Timestamp|
|{{addr}}| Address of the alerted location|
|{{lat}}| Latitude of the alerted location|
|{{lon}}| Longitude of the alerted location|
|{{streetNumber}}| Street number of the alerted location|
|{{streetName}}| Street name of the alerted location|
|{{zipcode}}| Zip code of the alerted location|
|{{country}}| Country of the alerted location|
|{{countryCode}}| 2 letter country code of the alerted location|
|{{city}}| City name of the alerted location|
|{{state}}| State name of the alerted location|
|{{stateCode}}| 2 letter state code of the alerted location|
|{{neighbourhood}}| Neighbourhood of the alerted location|
|{{gymname}}| Name of the gym|
|{{description}}| Description of the gym|
|{{level}}| Raid level|
|{{{detailsurl}}}| Descriptive picture url|
|{{{staticmap}}}| Static link to map|
|{{{rocketmap}}}| Link to Rocketmap with alerted location|
|{{{mapurl}}}|Link to google maps search of the location|
|{{{imgurl}}}| Link to monsters picture|
|{{color}}| Color to be used for embed (Color of monsters primary type)|
|{{ex}}| If raid takes place in a potential EX gym (empty string if false|
|{{#ex}}True{{/ex}}{{^ex}}False{{/ex}}| Prints True if ex eligible, False if not|
|{{flagemoji}}|Country flag emoji for location|


###### Quest alarms

```json
"quest":{
    "4": {
      "embed": {
        "title": "{{questType}}, {{flagemoji}} {{lat}}, {{lon}} {{addr}} \n Pokestop Name: {{name}}",
        "url": "{{{mapurl}}}",
        "description": "Conditions: {{conditions}} \nReward:  {{reward}} {{monsterNames}} \n[Google Maps]({{{mapurl}}}) | [Apple Maps]({{{applemap}}})",
        "thumbnail": {
          "url": "{{{imgurl}}}"
        },
        "image": {
          "url": "{{{url}}}"
        }
      }
    },
```



| Option        | Value         | 
| --------------- |:-------------:|
|{{now}}| Current Timestamp|
|{{questType}}| The type of quest (for example: battle in 3 raids|
|{{conditions}}| Extra conditions (for example: you must win these battles|
|{{reward}}| Reward if you finish (Pokemon, item or stardust)|
|{{monsterNames}}| Names of all reward monsters for this quest|
|{{itemNames}}| Names of all reward Items for this quest|
|{{stardust}}| The word "stardust" if it's that tyüe of quest|
|{{{imgurl}}}| Image of the reward. Could be Pokemon or Item or stardust|
|{{name}}| Name of the Pokestop|
|{{{rewardemoji}}}| emoji for the award as set in config/emoji.json|
|{{url}}| Link to the image of the Pokestop|
|{{minCp}}| Minimum CP of the reward pokemon |
|{{maxCp}}| Maximum CP of the reward pokemon|
|{{{staticmap}}}| Static link to map|
|{{{mapurl}}}| Link to google maps|
|{{{applemap}}}| Link to apple maps|
|{{areas}}| Matched geofence area names for alert|
|{{lat}}| Latitude of the alerted location|
|{{lon}}| Longitude of the alerted location|
|{{streetNumber}}| Street number of the alerted location|
|{{streetName}}| Street name of the alerted location|
|{{zipcode}}| Zip code of the alerted location|
|{{country}}| Country of the alerted location|
|{{countryCode}}| 2 letter country code of the alerted location|
|{{neighbourhood}}| Neighbourhood of the alerted location|
|{{city}}| City name of the alerted location|
|{{state}}| State name of the alerted location|
|{{stateCode}}| 2 letter state code of the alerted location|
|{{flagemoji}}|Country flag emoji for location|

###### Invasion alarms

```json
"incidents": {
  "3": {
      "embed": {
        "title": "Team Rocket  incident has started! at {{name}}",
        "description": "Name: {{gruntName}} {{genderName}}\nType: {{gruntType}} {{gruntTypeEmoji}}\nPossible Rewards: {{gruntRewards}}\n[Google Maps]({{{mapurl}}}) [Apple Maps]({{{applemap}}})",
        "color": "{{gruntTypeColor}}",
        "author": {
          "name": "end: {{time}} in {{tthm}}m {{tths}}s",
          "icon_url": "{{{imgurl}}}"
        }
      }
    },
}
```


| Option        | Value         | 
| --------------- |:-------------:|
|{{time}}| Invasion end time|
|{{tthh}}| Full hours until invasion ends|
|{{tthm}}| Full minutes until invasion ends|
|{{tths}}| Full seconds until invasion ends|
|{{now}}| Current Timestamp|
|{{gruntName}}| The name of the grunt (grunt female or grunt male)|
|{{gruntType}}| The type of invasion (for example: Rock, Mixed|
|{{gruntTypeEmoji}}| The emoji of type of invasion|
|{{gruntRewards}}| If known, a list of possible rewards. Splits into 2 lines if there's a 85/15 split chance of reward.|
|{{gruntTypeColor}}| The color code matching the grunt invasion type|
|{{genderName}}| The gender name or gender emoji of the grunt|
|{{gruntTypeId}}| The id of the invasion type|
|{{gender}}| The id of the grunt gender|
|{{name}}| Name of the Pokestop|
|{{{imgurl}}}| alias for Link to the image of the Pokestop|
|{{url}}| Link to the image of the Pokestop|
|{{{staticmap}}}| Static link to map|
|{{{mapurl}}}| Link to google maps|
|{{{applemap}}}| Link to apple maps|
|{{areas}}| Matched geofence area names for alert|
|{{lat}}| Latitude of the alerted location|
|{{lon}}| Longitude of the alerted location|
|{{streetNumber}}| Street number of the alerted location|
|{{streetName}}| Street name of the alerted location|
|{{zipcode}}| Zip code of the alerted location|
|{{country}}| Country of the alerted location|
|{{countryCode}}| 2 letter country code of the alerted location|
|{{neighbourhood}}| Neighbourhood of the alerted location|
|{{city}}| City name of the alerted location|
|{{state}}| State name of the alerted location|
|{{stateCode}}| 2 letter state code of the alerted location|
|{{flagemoji}}|Country flag emoji for location|

###### Greeting Message

```json
  "greeting": {
    "embed": {
      "title": "Welcome",
      "description": "Thank you for registering \nPlease set a location `!location name of place` or add ares where to receive alarms from",
      "fields":[
        {
          "name": "General commands",
          "value": "`!poracle`: Adds you to database and enables tracking` \n`!unregister`: Removes you from tracking \n`!stop`: Temporarily stops alarms \n`!start`: Re-enables alarms \n`!location yourArea`: Searches for yourArea and sets it as your location \n`!area add somePlace`: Sets one or multiple areas where to receive alarms from, areas need to be configured by admin \n`!area remove somePlace`: Removes a configured area"
        },
        {
          "name": "Monster tracking commands",
          "value": "`!track snorlax lapras d500 iv50 maxiv90 cp1000 level15`: Any arguments are optional, this command would alert you about snorlax and lapras within 500 meters of your location or inside an added area. The set filters require them to have IV between 50% - 90% be at least level 15 and minimum CP of 1000 \n`!untrack lapras vileplume`: will remove tracking for lapras and vileplume"
        },
        {
          "name": "Raid tracking commands",
          "value": "`!raid snorlax lapras d500 instinct`: Any arguments are optional, this command would alert you about snorlax and lapras raids within 500 meters of your location or inside an added area. The set filters require the Gym to be controlled by team Instinct \n`!unraid lapras vileplume`: will remove tracking for lapras and vileplume raids"
        },
        {
          "name": "Raid egg tracking commands",
          "value": "`!egg level3 d500 instinct`: Any arguments are optional, this command would alert you about level 3 raid eggs within 500 meters of your location or inside an added area. The set filters require the Gym to be controlled by team Instinct \n`!unegg level3`: will remove tracking for level 3 raid eggs"
        }
      ]
    }
  }
```

This is the message that is sent to newly added users via DM. There are no dynamic variables in this message.  

the "fields" without title and description are sent to users upon `!help` command
