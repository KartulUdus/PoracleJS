# Creating a Telegram bot & getting a token


#### Talk to @botFather

Telegram has a bot for creating bots :), find and talk to @botFather

Our conversation went something like this:
```
sudo, [17 Feb 2018 at 00:57:25]:
/newbot

BotFather, [17 Feb 2018 at 00:57:25]:
Alright, a new bot. How are we going to call it? Please choose a name for your bot.

sudo, [17 Feb 2018 at 00:57:58]:
PoracleJSbot

BotFather, [17 Feb 2018 at 00:57:58]:
Done! Congratulations on your new bot. You will find it at t.me/PoracleJSbot. You can now add a description, about section and profile picture for your bot, see /help for a list of commands. By the way, when you've finished creating your cool bot, ping our Bot Support if you want a better username for it. Just make sure the bot is fully operational before you do this.

Use this token to access the HTTP API:
462xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx


For a description of the Bot API, see this page: https://core.telegram.org/bots/api
```

This will be the token to use as `TLG_TOKEN=["462xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"]`

Next create a new group in telegram, name it and invite your bot to it.

This channel name can be used as `TLG_CHANNEL=newGroupName` so this will server as the chat where users can register with the `/poracle` command



There are a couple of options to find out your id for `TLG_ADMINS=["201234515"]`.

You can:
1) run the bot first without admins and run the `/adminid` command
2) Run without admins, register in the channel with `/poracle` and check your database for humans table id column
3) Interact with the bot and navigate to `https://api.telegram.org/bot462xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/getUpdates` to find your id

