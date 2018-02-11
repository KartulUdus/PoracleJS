const client = require('./client');
let config = require('config');
let log = require('../logger');
let prettyjson = require('prettyjson');
let query = require('../sql/queries');
let gmaps = require('../geo/google');
let monsterData = require('../util/monsters');
let teamData = require('../util/teams');
let _ = require('lodash');

module.exports = {

    sendDMAlarm: function (message, human, e, map) {
        if (map === 0) {message.embed.image.url = ''}
        user = client.users.get(human);
        user.send(message).then(msg =>  {
            if(config.discord.typereact){
                e.forEach(function(emoji){
                    client.users.get(human).dmChannel.lastMessage.react(emoji)
                })
            }
        })
    },
    sendTextAlarm: function (message, human, e, map) {
        if (map === 0){message.embed.image.url = ''}
        user = client.channels.get(human);
        user.send(message).then(msg =>  {
            if(config.discord.typereact){
                e.forEach(function(emoji){
                    client.channels.get(human).lastMessage.react(emoji)
                })
            }
        })
    },
};