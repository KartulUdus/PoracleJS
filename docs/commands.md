# Discord Commands

Generally, PoracleJS will respond to valid commands with either: 

* ✅ - Command successful
* 👌 - Already done
* 🙅 - Invalid conditions (wrong channel, not admin etc)

##### General commands

###### !poracle

`!poracle` is the command to register for alarms.  
This is available in a designated channel set by the admin.  
Once you successfully register, the bot will send you a DM with a greeting message

###### !stop

`!stop` Temporarily stops alarms

###### !start

`!start` Restarts alarms if they were stopped

###### !unregister

`!unreggister` Deletes all users tracking information. After !unregistering, you would need to register again with `!poracle` beofere new alarms.

###### !location 

`!loaction Tallinn kesklinn` for example, would register a users's location to `59.42685179999999,24.7595564`  
Instead of "Tallinn kesklinn" you can search for any address, city, country or known area available in google.

###### !area add

`!area add Tallinn` If the admin has set up a [Geofence](config.md)  name Tallinn, this command will add tracking from that area to the user.  
In case the area is not configured, the bot will reply with the areas that are avialable.  
You can also use multiple areas in the same command (separated by spaces) and only availble ones will be added.  

###### !area remove

`!area remove Tallinn` Removes Tallinn from tracked areas if configured and currently tracked.
You can also use multiple areas in the same command (separated by spaces) and only availble ones will be removed.

###### !tracked  

`!tracked` Shows a details list of Monsters Raids and Eggs user is tracking. Should the message exceed 6000 charecters, it will be uploaded into hastebin and a link will be sent to user.


##### Tracking commands

###### !track

`!track pikachu raichu d500 iv50 level10` This command would add tracking for Pikachu and Raichu that are *either* 500 meters from your location 
or within a tracked area.  
The command needs to include at least one monster and any amount of filters

available filters:

| Filter    | Example                        | More words  |
| --------- |:------------------------------:| -----------:|
|           |`!track pikachu`                | No filters, tracks pikachu within an area you are tracking in |
|d          |`!track pikachu d750`           | Tracks pikachu within 750 meters of  |
|iv         |`!track pikachu iv90`           | Tracks pikachu inside a tracked area with a minimum IV of 90%  |
|maxiv      |`!track pikachu maxiv0`         | Tracks pikachu with 0% IV   |
|cp         |`!track shuckle cp 300`         | Tracks shuckle with a minimum CP of 300|
|maxcp      |`!track shuckle cp 400`         | Tracks shuckle with a maximum CP of 400 |
|level      |`!track shuckle level20`        | Tracks shuckle with a minimum level 20|
|maxlevel   |`!track shuckle maxlevel1`      | Tracks shuckle with maximum level 1|
|atk        |`!track eevee atk15`            | Tracks eevee with a (minimum) 15 point attack value|
|def        |`!track eevee def14`            | Tracks eevee with a (minimum) 14 point defense value|
|sta        |`!track eevee atk10`            | Tracks eevee with a (minimum) 10 point stamina value|
|weight     |`!track magikarp weight131300`  | Tracks "big" magikarp (131300 grams and higher|
|maxweight  |`!track rattata maxweight24100` | Tracks "tiny" rarrara (24100 grams and lower)|
|everything |`!track everything iv90 level20`| Tracks eveything with a minimum IV of 90% level 20 and higher. <br/> ⚠️This will overwrite all other monster filters⚠️ |

###### !untrack

`!untrack pikachu raichu` This command would remove tracking for Pikachu and Raichu. 

Any monster name can be used in the same command or alternatively `!untrack everything` would remove all monster tracking.

###### !raid

`!raid snorlax d1000 instinct` This command would add tracking for Snorlax raids within 1 km or within a tracked area if the gym is controlled by team Instinct

Available filters:

| Filter    | Example                        | More words  |
| --------- |:------------------------------:| -----------:|
||`!raid snorlax`| No filters, snorlax raids within your tracked area|
|d|`!raid snorlax d1000`| Tracks snorlax raids within a kilometer|
|instinct|`!raid zapdos instinct`| Tracks zapdos raids where controlling team is Instinct|
|mystic|`!raid articuno mystic`| Tracks articuno raids where controlling team is mystic|
|valor|`!raid moltres valor`| Tracks moltres raids where controlling team is valor|
|harmony|`!raid venusaur harmony`| Tracks venusaur raids in uncontested gyms|


###### !egg 

`!egg level5 d10000` Tracks level 5 raid eggs within 10 kilometers. Command must include a level.

Available filters:

| Filter    | Example                        | More words  |
| --------- |:------------------------------:| -----------:|
||`!egg level5`| No filters, level 5 eggs within your tracked area|
|d|`!egg level4 d1000`| Tracks level 4 eggs within a kilometer|
|instinct|`!egg level3  instinct`| Tracks level 3 eggs where controlling team is Instinct|
|mystic|`!egg level2 mystic`| Tracks level 2 eggs where controlling team is mystic|
|valor|`!egg level1 valor`| Tracks level 1 eggs controlling team is valor|
|harmony|`!egg level5 harmony`| Tracks level 5 eggs in uncontested gyms|



###### !unegg

`!unegg level2` Removes tracking of level 2 raid eggs. 
Level is required to remove 


##### Admin commands

Admins for the bot are configured in `default.json` with an array of admin user ids.  

example:
`"admins": ["222742853648560458", "236899413619086080"],` 

###### !unregister

`!unregister @Kartulipudru#4525` - This would unregister Kartulipudru and remove all of his trackings.

###### !channel add

`!channel add` Command to add current text channel to receive alarms.  

###### !channel remove

`!channel remove` Command to remove current text channel and all of its trackings.

###### !channel area add

`!channel area add Tallinn` If the admin has set up a [Geofence](config.md)  name Tallinn, this command will add tracking from that area to the user.  
In case the area is not configured, go configure it.  

###### !channel area remove

`!channel area remove Tallinn` Removes Tallinn from tracked areas if configured and currently tracked.

###### !channel tracked  

`!channel tracked` Shows a details list of Monsters Raids and Eggs user is tracking. Should the message exceed 6000 charecters, it will be uploaded into hastebin and a link will be sent to user.

###### !channel track

`!channel track pikachu raichu d500 iv50 level10` This command would add tracking for Pikachu and Raichu that are *either* 500 meters from your location 
or within a tracked area.  
The command needs to include at least one monster and any amount of filters

available filters:

| Filter    | Example                        | More words  |
| --------- |:------------------------------:| -----------:|
|           |`!channel track pikachu`                | No filters, tracks pikachu within an area you are tracking in |
|d          |`!channel track pikachu d750`           | Tracks pikachu within 750 meters of  |
|iv         |`!channel track pikachu iv90`           | Tracks pikachu inside a tracked area with a minimum IV of 90%  |
|maxiv      |`!channel track pikachu maxiv0`         | Tracks pikachu with 0% IV   |
|cp         |`!channel track shuckle cp 300`         | Tracks shuckle with a minimum CP of 300|
|maxcp      |`!channel track shuckle cp 400`         | Tracks shuckle with a maximum CP of 400 |
|level      |`!channel track shuckle level20`        | Tracks shuckle with a minimum level 20|
|maxlevel   |`!channel track shuckle maxlevel1`      | Tracks shuckle with maximum level 1|
|atk        |`!channel track eevee atk15`            | Tracks eevee with a (minimum) 15 point attack value|
|def        |`!channel track eevee def14`            | Tracks eevee with a (minimum) 14 point defense value|
|sta        |`!channel track eevee atk10`            | Tracks eevee with a (minimum) 10 point stamina value|
|weight     |`!channel track magikarp weight131300`  | Tracks "big" magikarp (131300 grams and higher|
|maxweight  |`!channel track rattata maxweight24100` | Tracks "tiny" rarrara (24100 grams and lower)|
|everything |`!channel track everything iv90 level20`| Tracks eveything with a minimum IV of 90% level 20 and higher. <br/> ⚠️This will overwrite all other monster filters⚠️ |

###### !channel untrack

`!channel untrack pikachu raichu` This command would remove tracking for Pikachu and Raichu. 

###### !channel raid

`!channel raid snorlax d1000 instinct` This command would add tracking for Snorlax raids within 1 km or within a tracked area if the gym is controlled by team Instinct

Available filters:

| Filter    | Example                        | More words  |
| --------- |:------------------------------:| -----------:|
||`!channel raid snorlax`| No filters, snorlax raids within your tracked area|
|d|`!channel raid snorlax d1000`| Tracks snorlax raids within a kilometer|
|instinct|`!channel raid zapdos instinct`| Tracks zapdos raids where controlling team is Instinct|
|mystic|`!channel raid articuno mystic`| Tracks articuno raids where controlling team is mystic|
|valor|`!channel raid moltres valor`| Tracks moltres raids where controlling team is valor|
|harmony|`!channel raid venusaur harmony`| Tracks venusaur raids in uncontested gyms|


###### !channel egg 

`!channel egg level5 d10000` Tracks level 5 raid eggs within 10 kilometers. Command must include a level.

Available filters:

| Filter    | Example                        | More words  |
| --------- |:------------------------------:| -----------:|
||`!channel egg level5`| No filters, level 5 eggs within your tracked area|
|d|`!channel egg level4 d1000`| Tracks level 4 eggs within a kilometer|
|instinct|`!channel egg level3  instinct`| Tracks level 3 eggs where controlling team is Instinct|
|mystic|`!channel egg level2 mystic`| Tracks level 2 eggs where controlling team is mystic|
|valor|`!channel egg level1 valor`| Tracks level 1 eggs controlling team is valor|
|harmony|`!channel egg level5 harmony`| Tracks level 5 eggs in uncontested gyms|



###### !unegg

`!channel unegg level2` Removes tracking of level 2 raid eggs. 
Level is required to remove 
