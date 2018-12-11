# OCR Community day bot

## Summary

the community day bot is designed to run events to determine who has caught the most specified pomemon in a given time period.  

If an event is started, a new channel is created and the bot will attempt to read all uploaded images to determine users seen|caught|lucky counts.

After the event ends, the bot will compile a leaderboard to a specified channel to see who caught the most X pokemon during this event.

## Prerequisites

The sub-module has a hard dependency on [TESSERACT](https://github.com/tesseract-ocr/tesseract/wiki#installation)
Please follow their instructions to install it for your OS [here](https://github.com/tesseract-ocr/tesseract/wiki#installation)

## How to run the module 

First make sure your default.json [config](config.md) has values for modRole and comDayResultChannelId

example:
```json
  "discord": {
    "token": "YOURDISCORDTOKEN",
    "channel": "general",
    "admins": ["222742859059560458"],
    "comDayResultChannelId":"514465201911758849",
    "modRole":"mods",
    "prefix": "!",
    "typereact": true,
    "limitsec": 300,
    "limitamount": 20,
    "iv_colors": [
        "#9D9D9D",
        "#FFFFFF",
        "#1EFF00",
        "#0070DD",
        "#A335EE",
        "#FF8000"
    ]
  },

```

The module can then be started by:  
`npm run community`

Your bot needs to have sufficient rights to create & delete channels and messages

### Running events

If any user who has been assigned the config.discord.modRole role (role called "mods" from example above)  
enters the following command  
`!createevent Pi-Catch-You pikachu 5`  
the bot will:

- Create a channel called "pi-catch-you"
- Create the active event in the database for Pikachu
- Start processing images uploaded to the "pi-catch-you" channel to find your pikachu pokedex info
- End this event in 5 hours 
- Post a leaderboard to comDayResultChannelId once the event finishes 

The event can be held for any number of pokemon or hours.  The first argument after !createevent is the name of the channel  
`!createevent potato pikachu eevee 8 snorlax` - 3 pokemon (pikachu, eevee, snorlax) accepted in screenshots and event lasts for 8 hours in a channel called potato  

Events can be ended early by mods by entering 
`!stopevent`

### Screenshots

The bot is expecing screenshots for an active event pokemon from the pokedex screen  
![potato](https://cdn.discordapp.com/attachments/514785785753501697/514786707640680448/Screenshot_20181121-145806.png ':size=200')

If it detects the name of the pokemon (eevee) and there's is currently an active event for it, it will record the users initial score of seen/caught/lucky.

Before the end of the event, users would need to upload a second screenshot for each pokemon so that a comparison between the two can determine your score

