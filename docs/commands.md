# Discord Commands

You may notice, PoracleJS will react to valid commands with either: 

* ✅ - Command successful
* 👌 - Already done

##### General commands

###### !version

`!version` Shows current git status, version and recent commits of runnning Poracle instance

###### !help

`!help` sends instructions on some basic commands (from config/dts.json greeting template)

###### !poracle

`!poracle` is the command to register for alarms.  
This is available in a designated channel set by the admin.  
Once you successfully register, the bot will send you a DM with a greeting message

###### !stop

`!stop` Temporarily stops alarms

###### !start

`!start` Restarts alarms if they were stopped

###### !unregister

`!unregister` Deletes all users tracking information. After !unregistering, you would need to register again with `!poracle` before new alarms.

###### !location 

`!location Tallinn kesklinn` for example, would register a users's location to `59.42685179999999,24.7595564`  
Instead of "Tallinn kesklinn" you can search for any address, city, country or known area available in google.

###### !area add

`!area add Tallinn` If the admin has set up a [Geofence](config.md)  name Tallinn, this command will add tracking from that area to the user.  
In case the area is not configured, the bot will reply with the areas that are available.  
You can also use multiple areas in the same command (separated by spaces) and only available ones will be added.  

###### !area remove

`!area remove Tallinn` Removes Tallinn from tracked areas if configured and currently tracked.
You can also use multiple areas in the same command (separated by spaces) and only available ones will be removed.

###### !area list

`!area list` lists the possible areas you can add.  

###### !restore list

`!restore list` lists the possible filterset backups and admin can configure.  

###### !restore <baclup Name>

`!restore potato` Restores your filters to a "potato" backup (if configured by this name).  

###### !tracked  

`!tracked` Shows a details list of Monsters, Raids, Eggs and quests user is tracking. Should the message exceed 6000 charecters, it will be uploaded into hastebin and a link will be sent to user. If hastebin is down (like it often is), the bot will create a temporary file and upload it to discord as a reply.

##### Tracking commands

###### !track

`!track pikachu raichu d500 iv50 level10` This command would add tracking for Pikachu and Raichu that are 500 meters from your location.  
The command needs to include at least one monster and any amount of filters

available filters:

| Filter    | Example                         | More words  |
| --------- |:-------------------------------:| -----------:|
|           |`!track pikachu`                 | No filters, tracks pikachu within an area you are tracking in |
|d          |`!track pikachu d750`            | Tracks pikachu within 750 meters of location |
|iv         |`!track pikachu iv90`            | Tracks pikachu inside a tracked area with a minimum IV of 90%  |
|maxiv      |`!track pikachu maxiv0`          | Tracks pikachu with 0% IV   |
|cp         |`!track shuckle cp300`           | Tracks shuckle with a minimum CP of 300|
|form       |`!track unown forma formquestion`| Tracks unown with questionmark form or form A. Can only be used with one monster at a time. Monster needs to have forms|
|maxcp      |`!track shuckle maxcp400`        | Tracks shuckle with a maximum CP of 400 |
|level      |`!track shuckle level20`         | Tracks shuckle with a minimum level 20|
|maxlevel   |`!track shuckle maxlevel1`       | Tracks shuckle with maximum level 1|
|atk        |`!track eevee atk15`             | Tracks eevee with a (minimum) 15 point attack value|
|def        |`!track eevee def14`             | Tracks eevee with a (minimum) 14 point defense value|
|sta        |`!track eevee sta10`             | Tracks eevee with a (minimum) 10 point stamina value|
|maxatk     |`!track eevee maxatk0 iv0`       | Tracks eevee with a (maximum) 0 point attack value. iv filter is necessary to avoid unencoungered mon (iv on those is -1)|
|maxdef     |`!track eevee def10 maxdef14`    | Tracks eevee with a 10 - 14 point defense value|
|maxsta     |`!track eevee maxsta10 iv50`     | Tracks eevee with a (maximum) 10 point stamina value and iv over 50%|
|weight     |`!track magikarp weight13130`    | Tracks "big" magikarp (13130 grams and higher|
|maxweight  |`!track rattata maxweight2410`   | Tracks "tiny" rattata (2410 grams and lower)|
|male       |`!track rattata male`            | Tracks male rattata |
|female     |`!track pikachu female`          | Tracks female pikachu |
|genderless |`!track unown genderless`        | Tracks genderless unowns |
|everything |`!track everything iv90 level20` | Tracks eveything with a minimum IV of 90% level 20 and higher. <br/> ⚠️This will overwrite all other monster filters⚠️ |

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
|park|`!raid park level5 d1000`| Tracks all level 5 raids in an ex eligible gym within a kilometer, can only be used with no monsters in the command|
|level|`!raid level5 d1000`| Tracks all level 5 raids within a kilometer, can only be used with no monsters in the command|
|instinct|`!raid zapdos instinct`| Tracks zapdos raids where controlling team is Instinct|
|mystic|`!raid articuno mystic`| Tracks articuno raids where controlling team is mystic|
|valor|`!raid moltres valor`| Tracks moltres raids where controlling team is valor|
|form|`!raid exeggutor formalola`| Tracks Exeggutor raids i your area if form is Alolan| 
|harmony|`!raid venusaur harmony`| Tracks venusaur raids in uncontested gyms|

###### !raid remove

`!raid remove snorlax` Removes tracking of Snorlax raids. 
`!raid remove level5 level3` Removes tracking of level 5 and 3 raids.  

###### !egg 

`!egg level5 d10000` Tracks level 5 raid eggs within 10 kilometers. Command must include a level.

Available filters:

| Filter    | Example                        | More words  |
| --------- |:------------------------------:| -----------:|
||`!egg level5`| No filters, level 5 eggs within your tracked area|
|d|`!egg level4 d1000`| Tracks level 4 eggs within a kilometer|
|park|`!egg level4 park d1000`| Tracks level 4 eggs in an ex eligible gym within a kilometer|
|instinct|`!egg level3  instinct`| Tracks level 3 eggs where controlling team is Instinct|
|mystic|`!egg level2 mystic`| Tracks level 2 eggs where controlling team is mystic|
|valor|`!egg level1 valor`| Tracks level 1 eggs controlling team is valor|
|harmony|`!egg level5 harmony`| Tracks level 5 eggs in uncontested gyms|

###### !egg remove

`!egg remove level2` Removes tracking of level 2 raid eggs.  
Level is required to remove egg tracking.

###### !quest

`!quest pikachu poke ball stardust d10000` Tracks quests that would reward a pikachu, pokéballs or stardust within 10km

Available filters:

| Filter    | Example                        | More words  |
| --------- |:------------------------------:| -----------:|
|all pokemon|`!quest all pokemon`| tracks quests for all pokemon rewards within your area|
|all items|`!quest all items`| tracks quests for all item rewards within your area|
|d|`!quest snorlax d50`| Tracks Snorlax awarding quests within 50m of set location|
|stardust|`!quest stardust d1000`| Tracks quests within 1km that awards stardust|


###### !quest remove

`!quest remove all pokemon pinap berry stardust`  
Removes quest tracking for all pokemon, pinap berries and strdust.



##### Admin commands

Admin commands allow an admin to run DM commands (!track, !raid, !area, !location etc) in channels.
Additionally, if the command includes a discord webhook (similar to `https://discordapp.com/api/webhooks/533935953597076/J5t8S43hi5fbg-eBVuJDhD2RX_FMSUl`) an admin could add tracking to any discord webhook.  

Admins for the bot are configured in `.env` or `config/local.json` with an array of admin user ids.  

example:
`ADMINS=["222742853648560458", "236899413619086080"]` 

###### !unregister

`!unregister @Kartulipudru#4525` - This would unregister Kartulipudru and remove all of his trackings.

###### !channel add

`!channel add` Command to add current text channel to receive alarms.  

###### !channel remove

`!channel remove` Command to remove current text channel and all of its trackings.

###### !webhook add

`!webhook add https://discordapp.com/api/webhooks/533935953597076/J5t8S43hi5fbg-eBVuJDhD2RX_FMSUl` Command to add webhook to receive alarms.  

###### !webhook remove

`!webhook remove https://discordapp.com/api/webhooks/533935953597076/J5t8S43hi5fbg-eBVuJDhD2RX_FMSUl` Command to remove webhook and all of its trackings.  

###### !webhook list

`!webhook list` show currently registered webhooks

###### !track 

`!track pikachu https://discordapp.com/api/webhooks/533935953597076/J5t8S43hi5fbg-eBVuJDhD2RX_FMSUl` Adds pikachu tracking for webhook in the command  

###### !backup 

`!backup potato` Creates a backup of your current DM or Channel filters and creates a backup called `potato` for anyone to use