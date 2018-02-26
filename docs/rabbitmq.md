# RabbitMQ 🐰

[RabbitMQ](http://www.rabbitmq.com/) is a popular open source message broker using AMQP.  
it's used as the main queuing system for PoracljeJS incoming webhooks.  

#### Easy install

Easiest way to get up and running with rabbitmq, is to use [Docker](https://www.docker.com/get-docker).  
Once you have [Docker](https://www.docker.com/get-docker) installed, you can deploy a rabbitmq container with:  
```
docker run -d --hostname bunnywabbit --name poracle-rabbit -p 15672:15672 -p 5672:5672 -e RABBITMQ_DEFAULT_USER=poracle -e RABBITMQ_DEFAULT_PASS=poracle rabbitmq:3-management
```

This will launch an example RabbitMQ container that you can access with  
 `"conn": "amqp://poracle:poracle@localhost:5672"` in your config.  

To remove this example container, you can run `docker rm poracle-rabbit`

#### Expert mode

To install RabbitMQ natively, you will need a [Supported](http://www.rabbitmq.com/which-erlang.html) version of [Erlang](http://www.erlang.org/).  

You can follow the install process for your OS:  

- [Windows](http://www.rabbitmq.com/install-windows.html)
- [Linux](http://www.rabbitmq.com/install-debian.html)
- [OSX](http://www.rabbitmq.com/install-standalone-mac.html)

Once installed, the Management plugin can be enabled by   
`rabbitmq-plugins enable rabbitmq_management`

##### Administration panel

The administration panel of RabbitMQ provides  a clear overview of how many messages are being handeld and the current queue.  
The administration panel can be accessed on `http://localhost:15672` with your username and password.  
If you host RabbitMQ on a separate server, you will need to forward port `15672` and access it on `http://YourServerIP:15672`   
![](/_assets/Screen Shot 2018-02-25 at 12.46.03.png)  

Ideally the "Queued messages" should always stay at 0. Should you notice an increase in queued messaged, please make sure your worker is running `npm run worker`  
Should you notice no messages coming in, Please make sure your webserver is running `npm run webserver` and that RocketMap is sending it webhooks.

If you wish to change your Username or Password, this can be done through the `Admin` tab or RabbitMQ. Make sure your new user is marked administrator and include the user in the virtual host.  

