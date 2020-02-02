# Config file


#### Config files

Before first running PoracleJS, you need to create a `.env` file.  
There is an example you can copy over to begin with `cp .env.example .env`.  

Altenatively, you can use a json config by copying from defaults `cp config/default.json config/local.json`


###### Database settings
```json
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_DATABASE=
DB_PORT=
DB_CONNECTION_LIMIT=
DB_CONNECTION_TIMEOUT=
```

| Option        | Value         | 
| ------------- |:-------------:| 
| host      |  Database host    | 
| user      |  Database username| 
| password  |  Database password|   
| database  |  Database name    |   
| port      |  Connection port  |   
| connection limit| Maximum amount of connections. Maximum will not be used unless necessary.
|   


###### General settings

```json
LOG_LEVEL=
LOG_SIZE=
HOST=
PORT=
IMGURL=
MAX_POKEMON=
MIN_TTH=
IP_WHITELIST=
IP_BLACKLIST=
  ```
  
  | Option        | Value         | 
  | ------------- |:-------------:| 
  |logLevel | Logging level, can be `debug`, `info` or `error`.|
  |logSize | Maximum size of log file in Mb, default 25.|
  |host |   Webserver host. |
  |port | Webserver port. | 
  |imgurl | Source of monster icons. Trailing slash is important. [see originals](https://github.com/KartulUdus/PoracleJS/tree/master/src/app/util/images) |
  | max_pokemon | Biggest released pokemon_id. Needed for tracking batch tracking of mainimum/maximum IV.|
  | monsterMinimumTimeTillHidden | Minimum amount of seconds for an alert to trigger|
  | ipWhitelist | List of allowed IP's to send POST webhooks. defaults to everything []|
  | ipBlacklist | List of blocked IP's to send POST webhooks. defaults to nothing []|

##### Locale settings
  ```json
TIME_FORMAT=             # default: en-gb
TIME_STRING=             # default: LTS
ADDR_FORMAT=             # default: %S %n
PORACLE_LANGUAGE=                # one of ['en', 'de', 'fr', 'ja', 'ko', 'ru']
  ```
  | Option        | Value         | 
  | ------------- |:-------------:| 
  | timeformat    | sets 24 or 12h AM/PM time. use `"en-us"` for 12h time.|
  | time | Time string format for disappear time. `LTS` for hours minutes and seconds `LT` for just hours and minutes.|
  | addressformat | Format for the geocoded address. Can be any combination of : <br/>%P - country <br/>%p - country code <br/>%n - street number <br/>%S - street name <br/>%z - zip code <br/>%T - State  <br/>%t - state code|
  | language | Translates pokemon for alerts and commands. options are one of one of ['en', 'de', 'fr', 'ja', 'ko', 'ru'].|


##### Geocoding Settings Maps settings

```json
GEO_PROVIDER=
GEO_KEY=

## Provider of {{{staticMap}}} dts static map urls. (google | osm | mapbox). Please note 'osm' provider is a key from 'mapquest'
STATIC_PROVIDER=
STATIC_KEY=

## Static map dimensions
MAP_WIDTH=
MAP_HEIGHT=
MAP_ZOOM=
MAP_TYPE=


```
| Option        | Value         | 
| ------------- |:-------------:| 
|provider| either OSM or google for geocoding|
|staticProvider|provider for static maps (google , osm , mapbox)|
|geocodingKey| your google geocoding key, doesn't matter if you use 'osm' as provider|
|staticKey| Your Mapquest MapBox or Google api key|
|googlekey | Your google maps API key |
|width| Width in pixels of the static map.|
|height| Height in pixels of the static map.|
|zoom | Zoom level of the static map.|
|type| Style of static map. Can be one of: <br/>roadmap <br/>satellite <br/>hybid <br/>dark |


##### Telegram settings

```js
TLG_TOKEN=["400000002:AAhdsjl_alkrhjfsqlkjEQ"] 
TLG_ADMINS=["201234515"]  # Array of admin id's who can manage channels 
TLG_CHANNEL=          # Channel name to register in
TLG_IMAGES=           # if telegram should send image, default=true
TLG_LOCATION=         # if telegram should send map, default=true

```

##### Discord settings

```json
## If discord is enabled, default true
# DISCORD_ENABLED=
## Discord token array. Has to be in [ "square.brackets.and.quotes" ]
DISCORD_TOKEN=["NTM2Mj11111111111111111111.222222222222222xVTr1s"]
## List of discord user id's that can register channels and run admin commands.
ADMINS=["222742859059560458", "353901047493951488"]
## Channel name to register with the `!poracle` command
REGISTER_CHANNEL=
## Role name that automatically registers or unregisters the user to !poracle, default 'general'
REGISTER_ROLE=

## prefix to start !commands with
PREFIX=
## If bot should react to messages with the monster type (true | false)
TYPE_REACT=
## Limit of messages any channel or user can receive within an amount of seconds
LIMIT_SEC=
LIMIT_MESSAGES=
## Custom color codes for {{ivColor}} example: ["#9D9D9D","#FFFFFF","#1EFF00","#0070DD","#A335EE","#FF8000"]
IV_COLORS=
```

| Option        | Value         | 
| ------------- |:-------------:| 
|token | Your [discord token](discordbot.md)|
|channel | The text channel where registering `!poracle` is possible. |
|admins| List of admin ID's that can register channel tracking and unregister users.|
|userRole| role name to automatically register for !poracle|
|modRole| Role required to start community day events via `!createevent channelname pokemonname hours`|
|prefix| Prefix to all discord `!commands`|
|typereact| `true` or `false`. If true, bot will react to alarms with the type of that alarmed monster.|
|limitsec| Amount of seconds during which a user can only receive `limitamount` alerts |
|limitamount| Amount of alerts that a user can receive during `limitsec` seconds |
|iv_colors| A list of css style hex colors for iv quality.|

**IV colors**
There must be 6 colors defined, from worst IV to best.

The Colors are defined as you would in a html or css file: #rrggbb eg: #ff0000 for red.

The tiers of IV colors are as follows:

  | Min IV      | Max IV      | Default color  |
  | ----------- | ----------- | -------------- |
  | 0 %         | 24.9 %      | Gray   #9D9D9D |
  | 25 %        | 49.9 %      | White  #FFFFFF |
  | 50 %        | 81.9 %      | Green  #1EFF00 |
  | 82 %        | 89.9 %      | Blue   #0070DD |
  | 90 %        | 99.9 %      | Purple #A335EE |
  | 100 %       | 100 %       | Orange #FF8000 |



**Commands**

Any command name can be renamed in the config file.

Use the below environment variables, or create a `config/local.json` and see possible options from defaults `config/default.json`

```json
CMDPORACLE=
CMDAREA=
CMDBACKUP=
CMDCHANNEL=
CMDEGG=
CMDHELP=
CMDLODCATION=
CMDQUEST=
CMDRAID=
CMDRESTORE=
CMDSTART=
CMDSTOP=
CMDTRACK=
CMDTRACKED=
CMDUNREGISTER=
CMDUNTRACK=
CMDVERSION=
CMDWEBHOOK=
```

This does **NOT** rename command properties such as `remove`, `everything` or any of the genders.



When you are done with your config, you can make sure that it's a [valid JSON format here](https://jsonlint.com/)