# Config file


#### default.json

Before first running PoracleJS, you need to create a `config/default.json`.  
This config file consist of different objects for different configurations.


###### Database settings
```json
  "db": {
    "host": "",
    "user": "",
    "password": "",
    "database": "",
    "port": "",
    "connectionLimit": 100
  }
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
  "general": {
    "logLevel": "debug",
    "host": "127.0.0.1",
    "port": "3031",
    "imgurl": "https://raw.githubusercontent.com/KartulUdus/PoracleJS/master/src/app/util/images/",
    "max_pokemon": 490
  }
  ```
  
  | Option        | Value         | 
  | ------------- |:-------------:| 
  |logLevel | Logging level, can be `debug`, `info` or `error`.|
  |host |   Webserver host. |
  |port | Webserver port. | 
  |imgurl | Source of monster icons. Trailing slash is important. [see originals](https://github.com/KartulUdus/PoracleJS/tree/master/src/app/util/images) |
  | max_pokemon | Biggest released pokemon_id. Needed for tracking batch tracking of mainimum/maximum IV.|

##### Locale settings
  ```json
    "locale": {
      "timeformat": "en-gb",
      "time": "LTS",
      "addressformat": "%S %n",
      "commandMonstersJson": "../util/monsters",
      "monstersJson": "./util/monsters",
      "movesJson": "./util/moves"
    }
  ```
  | Option        | Value         | 
  | ------------- |:-------------:| 
  | timeformat    | sets 24 or 12h AM/PM time. use `"en-us"` for 12h time.|
  | time | Time string format for disappear time. `LTS` for hours minutes and seconds `LT` for just hours and minutes.|
  | addressformat | Format for the geocoded address. Can be any combination of : <br/>%P - country <br/>%p - country code <br/>%n - street number <br/>%S - street name <br/>%z - zip code <br/>%T - State  <br/>%t - state code|
  | commandMonstersJson | Monster locale file for discord commands. [Reference](https://github.com/KartulUdus/PoracleJS/tree/master/src/app/util/locale).|
  | monstersJson    | Monster locale file for incoming alarms. [Reference](https://github.com/KartulUdus/PoracleJS/tree/master/src/app/util/locale).|
  | movesJson    | Moves locale file for incoming alarms. [Reference](https://github.com/KartulUdus/PoracleJS/tree/master/src/app/util/locale).|
  | colorsJson   | Colors for IV brackets |



##### Google Maps settings

```json
  "gmaps": {
    "key":"",
    "width": 250,
    "height": 175,
    "zoom": 15,
    "type": "roadmap",
    "rocketmap":"https://yourRocketMap.com/"
  }
```
| Option        | Value         | 
| ------------- |:-------------:| 
|key | Your google maps API key |
|width| Width in pixels of the static map.|
|height| Height in pixels of the static map.|
|zoom | Zoom level of the static map.|
|type| Style of static map. Can be one of: <br/>roadmap <br/>satellite <br/>hybid <br/>dark |
|rocketmap | link to your rocketmap, can be used to automatically link locations of alarms. Trailing slash is important. |

##### Discord settings

```json
  "discord": {
    "token": "",
    "channel": "general",
    "admins": ["222742859059560458"],
    "comDayResultChannelId":"514465201911758849",
    "modRole":"",
    "prefix": "!",
    "typereact": true,
    "limitsec": 300,
    "limitamount": 30,
    "iv_colors": [
        "#9D9D9D",
        "#FFFFFF",
        "#1EFF00",
        "#0070DD",
        "#A335EE",
        "#FF8000"
    ]
  }
```

| Option        | Value         | 
| ------------- |:-------------:| 
|token | Your [discord token](discordbot.md)|
|channel | The text channel where registering `!poracle` is possible. |
|admins| List of admin ID's that can register channel tracking and unregister users.|
|comDayResultChannelId| channel where community bot results will be posted|
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

```json
  "rabbit": {
    "conn": "amqp://poracle:poracle@localhost:5672"
  }
```
| Option        | Value         | 
| ------------- |:-------------:| 
|conn| Your connection string to [RabbitMQ](http://www.rabbitmq.com/download.html).|

##### Geofence Settings

```json
"geofence": [...]
```

| Option        | Value         | 
| ------------- |:-------------:| 
|geofence| A list of geojson areas that alarms can be tracked from. [Create and download geofences here](http://geo.jasparke.net/).|

When you are done with your config, you can make sure that it's a [valid JSON format here](https://jsonlint.com/)