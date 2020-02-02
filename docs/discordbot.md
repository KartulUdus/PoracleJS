# Creating a discord bot & getting a token

Creating a bot in discord is easy. First you need to go to [here](https://discordapp.com/developers/applications/me)  
and click "New App"![](/_assets/Screen%20Shot%202017-12-07%20at%2001.55.05.png)  
Now give your bot a name and a picture, a description isn't necessary.  
![](/_assets/Screen%20Shot%202017-12-07%20at%2002.02.19.png)  
Click "Create Application". Please note that your discord e-mail address needs to be verified before you can create an app.  
On the next page scroll down until you see "Create a bot user" and click that. Also click "Yes, do it!".  
![](/_assets/Screen%20Shot%202017-12-07%20at%2002.09.44.png)  
Now you can get your **token** by using the "click to reveal" button in the App Bot User section.  
![](/_assets/Screen%20Shot%202017-12-07%20at%2002.12.19.png)  
Now it's time to invite your bot to your server. Don't worry about the bot being up and running for this next step. Replace

`YOUR_CLIENT_ID_HERE`

in this URL`https://discordapp.com/oauth2/authorize?&client_id=YOUR_CLIENT_ID_HERE&scope=bot&permissions=0`

with your Client ID as shown below  
![](/_assets/Screen%20Shot%202017-12-07%20at%2002.16.33.png)  
Once you follow `https://discordapp.com/oauth2/authorize?&client_id=YOUR_CLIENT_ID_HERE&scope=bot&permissions=0`

You will be asked to sign in and authorize the bot to join your server.

