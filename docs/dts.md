# Custom Messages

#### dts.json

All alarm messages can be cusomtized via the `./config/dts.json` file.  

A useful visualizer can be found [HERE](https://leovoel.github.io/embed-visualizer/) 

These are separated by the type of alarm.


###### Monster alarms

```json
  "monster": {
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
```

For monsters without IV information, you can specify a different message.

```json
"monsterNoIv": {
    "embed": {
      "title": "a wild {{{name}}} has appeared!",
      "description": "It will despawn at {{time}}, you have {{tthm}}m {{tths}}s left \naddress: {{addr}} ",
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
  },
```


Any of the fields can be cusomtized with the following:

| Option        | Value         | 
| --------------- |:-------------:|
|{{name}}| Monsters name|
|{{time}}| Disappear time|
|{{tthh}}| Full hours until hidden|
|{{tthm}}| Full minutes until hidden|
|{{tths}}| Full seconds until hidden|
|{{addr}}| Address of the alerted location|
|{{streetNumber}}| Street number of the alerted location|
|{{streetName}}| Street name of the alerted location|
|{{zipcode}}| Zip code of the alerted location|
|{{country}}| Country of the alerted location|
|{{countryCode}}| 2 letter country code of the alerted location|
|{{city}}| City name of the alerted location|
|{{state}}| State name of the alerted location|
|{{stateCode}}| 2 letter state code of the alerted location|
|{{move1}}| Monsers quick move|
|{{move2}}| Monsters charge move|
|{{iv}}| Monsters Individual Value Precentage|
|{{cp}}| Monsters CP|
|{{level}}| Monsters level|
|{{atk}}| Monsters attack|
|{{def}}| Monsters defense|
|{{sta}}| Monsters stamina|
|{{weight}}| Monsters weight in kilograms|
|{{{staticmap}}}| Static link to map|
|{{{rocketmap}}}| Link to Rocketmap with alerted location|
|{{{mapurl}}}|Link to google maps search of the location|
|{{{imgurl}}}| Link to monsters picture|
|{{form}}| Monsters form|
|{{color}}| Color to be used for embed (Color of monsters primary type)|


###### Raid alarms

```json
  "raid": {
    "embed": {
      "title": "Raid against {{name}} has started! at {{gymname}}",
      "description": "It will end at {{time}}, you have {{tthm}}m {{tths}}s left \n{{move1}}|{{move2}} Level:{{level}} \n:100:=={{cp20}}CP or if boosted {{cp25}}CP  \naddress: {{addr}} ",
      "url": "{{{rocketmap}}}",
      "color": "{{color}}",
      "thumbnail": {
        "url": "{{{detailsurl}}}"
      },
      "image": {
        "url": "{{{staticmap}}}"
      },
      "author": {
        "name": "{{name}}",
        "url": "{{{rocketmap}}}",
        "icon_url": "{{{imgurl}}}"
      }
    }
  }
```

| Option        | Value         | 
| --------------- |:-------------:|
|{{name}}| Monsters name|
|{{time}}| Disappear time|
|{{tthh}}| Full hours until raid ends|
|{{tthm}}| Full minutes until raid ends|
|{{tths}}| Full seconds until raid ends|
|{{addr}}| Address of the alerted location|
|{{streetNumber}}| Street number of the alerted location|
|{{streetName}}| Street name of the alerted location|
|{{zipcode}}| Zip code of the alerted location|
|{{country}}| Country of the alerted location|
|{{countryCode}}| 2 letter country code of the alerted location|
|{{city}}| City name of the alerted location|
|{{state}}| State name of the alerted location|
|{{stateCode}}| 2 letter state code of the alerted location|
|{{move1}}| Monsers quick move|
|{{move2}}| Monsters charge move|
|{{cp20}}| Monsters cp with 100% perfect IV and level 20|
|{{cp25}}| Monsters cp with 100% perfect IV and level 25|
|{{mincp20}}| Monsters cp with 0% perfect IV and level 20|
|{{mincp20}}| Monsters cp with 0% perfect IV and level 25|
|{{level}}| Raid level|
|{{gymname}}| Name of the gym|
|{{description}}| Description of the gym|
|{{{detailsurl}}}| Descriptive picture url|
|{{{staticmap}}}| Static link to map|
|{{{rocketmap}}}| Link to Rocketmap with alerted location|
|{{{mapurl}}}|Link to google maps search of the location|
|{{{imgurl}}}| Link to monsters picture|
|{{color}}| Color to be used for embed (Color of monsters primary type)|



###### Egg alarms

```json
  "egg": {
    "embed": {
      "title": "Raid level {{level}} will start soon at {{gymname}}",
      "description": "It will hatch at {{time}}, in{{tthm}}m {{tths}}s \naddress: {{addr}} \n{{{description}}} ",
      "url": "{{{rocketmap}}}",
      "color": "{{color}}",
      "thumbnail": {
        "url": "{{{detailsurl}}}"
      },
      "image": {
        "url": "{{{staticmap}}}"
      },
      "author": {
        "name": "Level{{level}} Raid",
        "url": "{{{rocketmap}}}",
        "icon_url": "{{{imgurl}}}"
      }
    }
  }
```



| Option        | Value         | 
| --------------- |:-------------:|
|{{time}}| Disappear time|
|{{tthh}}| Full hours until raid ends|
|{{tthm}}| Full minutes until raid ends|
|{{tths}}| Full seconds until raid ends|
|{{addr}}| Address of the alerted location|
|{{streetNumber}}| Street number of the alerted location|
|{{streetName}}| Street name of the alerted location|
|{{zipcode}}| Zip code of the alerted location|
|{{country}}| Country of the alerted location|
|{{countryCode}}| 2 letter country code of the alerted location|
|{{city}}| City name of the alerted location|
|{{state}}| State name of the alerted location|
|{{stateCode}}| 2 letter state code of the alerted location|
|{{gymname}}| Name of the gym|
|{{description}}| Description of the gym|
|{{level}}| Raid level|
|{{{detailsurl}}}| Descriptive picture url|
|{{{staticmap}}}| Static link to map|
|{{{rocketmap}}}| Link to Rocketmap with alerted location|
|{{{mapurl}}}|Link to google maps search of the location|
|{{{imgurl}}}| Link to monsters picture|
|{{color}}| Color to be used for embed (Color of monsters primary type)|


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
