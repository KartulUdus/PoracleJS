const { Client } = require('discord.js')
const log = require('../../lib/logger')
const axios = require('axios')
const hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

class Worker {


    constructor(token, id, config){
        this.id = id
        this.token = token
        this.config = config
        this.busy = true
        this.users = []
        this.client = {}
        this.bounceWorker()
        this.work()
    }

    async sleep(n) { return new Promise(resolve=>setTimeout(resolve,n)) }

    async setLitseners(){
        this.client.on('error', err => {
            this.busy = true
            log.error(`Discord commando ${err.message} \n bouncing`)
            this.bounceWorker()
        })
        this.client.on('warn', err => {
            log.error(`Discord commando ${err.message} \n bouncing`)
        })
        this.client.on('ready', () => { 
            log.info(`discord commando ${this.client.user.tag} ready for action`)
        })
    }

    async bounceWorker(){
        delete this.client
        this.client = new Client()
        try {
            await this.setLitseners()
            await this.client.login(this.token)
            await this.client.user.setStatus('invisible')
        }
        catch (err) {
            log.error(`Discord commando didn't bounce, \n ${err.message} \n trying again`)
            await this.sleep(2000)
            return await this.bounceWorker()
        }

    }

    async work(data){
        this.busy = true
        switch (data.type) {
            case 'discord-user': {
                await this.userAlert(data)
                this.busy = false
            }
            case 'discord-channel': {
                await this.channelAlert(data)
                this.busy = false

            }
            case 'discord-webhook': {
                await this.webhookAlert(data)
                this.busy = false
            }
            default:
        }

    }

    async userAlert (data){
        return new Promise((resolve) => 
            {
                const user = this.client.users.get(data.job.target)
                if (!user) resolve(this.log.warning(`user ${data.name} not found`))
                try{
                    await user.send(data.message.content || '', data.message)
                } catch (err){
                    this.log.error(`Failed to send Discord alert to ${data.name}, ${err.message}`)
                }
                resolve
            })
    }
    async channelAlert (data){
        return new Promise((resolve) =>    
        {
            if (!data.target.match(hookRegex)) resolve(this.log.warn(`Webhook, ${data.name} does not look like a link, exiting`))
            if (data.message.embed) data.message.embeds = [data.message.embed]
            try {
                await axios({
					method: 'post',
					url: data.target,
					data: data.message,
				})
            } catch (err) {
                this.log.error(`Webhook ${data.name} failed with, ${err.message}`)
            }
            resolve()
        })
    }
    async webhookAlert (data){
        
    }
}

module.exports = Worker