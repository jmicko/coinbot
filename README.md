
# Coinbot

## Notes about V3

This is a complete rewrite of the coinbot front end client, as well as a reorganization of the whole project structure. The original project was a rather monolithic repo and the server and client code was somewhat mixed together. This version is split into client and server folders, and uses a more modern stack for the front end. The client is built with React and Vite in typescript, and the server is built with Node.js and Express. The database is still Postgresql. The bot itself is still the same aside from some minor bug fixes, but the interface has been updated for better maintainability and user experience.

With the new changes, you will need to move some files around if you are pulling the repo into an older version, as they are in the gitignore. The .env file is now located in the `/server` directory, and there are new requirements for the new version of the vapid package. This is reflected in the new env example, and you will get a warning in the console if you need to change what you currently have.

The old version put the `/node_modules` in the root directory, but this version puts them in the `/client` and `/server` directories. This is a better practice, but it does mean that you will need to run `npm install` in both directories to get the project up and running. you will also want to delete the node_modules in the root directory to avoid confusion and free up some space.

You can also delete the old build directory if you have it built in the root directory, as it is no longer used. The new client build is in the client directory, and the server has been updated to serve the client from there. Vite will put it in a `dist` directory in the client folder.

The old client is still in the repo in the /old_fe and will remain there for a while as a reference. much of it is incompatible with the new server, but there are still one or two things that I need to pull from it, so for now it stays.

Backend rewrite coming soon. :v:

# `Description`

Coinbot is a Bitcoin trading bot project built for the Coinbase cryptocurrency exchange.

![Coinbot web interface](./coinbot.png)

The strategy is based on the creation of trade-pair values, and is very similar to a grid bot with a little more fine control. A trade-pair is the combination of two precalculated order price positions, a "buy" price and a "sell" price, that are stored in the coinbot's local database. The buy price should always be lower than the sell price, and the difference between the two should at least cover the cost of exchange fees. The bot keeps track of which "side" (buy or sell) is currently on order on Coinbase. each order is stored locally with the original buy and sell values. When the coinbot detects a trade has settled on the exchange, it flips sides on the trade by creating a new trade on the other side.

When a "buy" is settled, another order will immediately be placed as a "sell" at a higher price and vice versa. The prices of each of these orders are stored as the values of the trade-pair. When a buy order and a sell order each go through from the same trade-pair values, a profit is made. The two transactions that contributed to the profit are the trade-pair.

The volume of the trade-pair does not matter so much, as fees are calculated by percentage. A smaller volume allows for greater distribution of trade-pair positions across a wider price range with a given amount of capital, and will better cover the high price volatility of a crypto currency. A higher volume will produce greater profits per trade, assuming the price of Bitcoin stays withing the range of the bot.

Placing dozens of lower volume trade-pairs at many different price points allows the bot to capture smaller but more frequent profits. The huge price swings that occasionally make someone rich are notable in their own light, but do not happen frequently at all when compared to the smaller 1% - 5% swings that happen on a daily basis. The coinbot does not care, and allows for both of these strategies to work.

For example: A trade-pair could be set up between the prices of $10,000 and $100,000, and return a huge profit if the price of Bitcoin hits both sides. Or it could be set up between $30,000 and $31,000 for much smaller, but more frequent profits as the price staggers past them. In testing, the latter strategy has shown to be effective.

But again, the coinbot does not care, nor do the developers.

However, a higher amount of open trades does increase the amount of processing done by the bot. The effects of this are unknown, but this is not a high-speed bot on a Wall Street exchange. It was made for a slow and unreliable home internet connection. On that note, one of the developers uses a satellite connection (Starlink) and a Raspberry Pi. It hasn't been an issue. The bot keeps local copies of the trades it makes, places limit orders, and does not rely on the ability to react quickly to incoming market data. If the internet connection is cut off, the limit orders will still go through on Coinbase, and the bot will simply check and react to them later when the internet is restored. Delayed reactions to rapid price movements can result in taker fees being charged on trades, which should be taken into account when deciding the trade-pair percent increase.

## `DISCLAIMER`

This is an experimental bot. It requires a connection to a Coinbase account, and has the ability to handle real money. Coinbase does not currently provide a sandbox API for testing purposes, but they plan to in the future. It is recommended only to use the upcoming sandbox API with this bot as a demonstration of what is possible with the Coinbase API, or use a small amount of money that you are willing to part with. Any use of the software provided in this repository is the responsibility of the user, and the developers of the software cannot be held responsible for any financial operations made with the software, or harm done to your computer as a result of using the software. Use of this software does not come with any guarantee of profits, losses, fees, taxes, or other financial consequences. Bitcoin and other cryptocurrencies may be taxed. Trading cryptocurrency is a risk taken by those making the trades. No financial advice is given in regards to the use of this software. Your portfolio can always go to zero, and Coinbase can always go bankrupt.

You trade at your own risk.

There are also currently no security features built in to the coinbot other than basic password protection. Hosting in the cloud or on any device that can be accessed from the internet, from an intranet, or by anyone who you do not want to be able access it is not recommended.

## `Advantages`

This is a fairly low-risk strategy, as it requires no statistical analysis or market data. There is no risk of guessing trends incorrectly because the coinbot does not guess. It works off of predetermined prices. Profits are made when the price of Bitcoin passes the "buy" and "sell" prices of a trade-pair in that order. If left alone, the coinbot will do this automatically at the set price points as long as the price of bitcoin is hitting them. The coinbot actually benefits from higher volatility and large fast price swings because it increases the chances that the trade-pair values will be hit.

## `Disadvantages`

A notable disadvantage of this strategy is that when the price takes a sharp upward trend, the coinbot will sell at a fixed price regardless. This slows down the potential rate of profits compared to strategies that attempt to calculate the tops and bottoms of market curves.

It also does not take into account market volumes, or the bird-themed social media accounts of billionaire entrepreneurs. That's not what this project is about. :bird:

## `Features`

### Web-based Interface

Use and configuration of the coinbot is done from a web app in the browser. This includes user registration and api details. It is mobile responsive, and works great as a progressive web app.

### Create New Trade Pairs

New trade-pair values can be individually created from the main interface. There is a calculator to determine both sides of the trade-pair, and estimate fees and profits. Note that these are an estimation, and nothing is guaranteed.

### Auto Setup

There is a function in the settings menu that will allow you to input the desired parameters, and automatically place up to 10,000 trades (the maximum allowed) for you. This is much easier than manually entering them when they will all have similar values.

### Simulator

\# Not currently implemented - need to rewrite it because I just don't trust the accuracy \#

Before starting the auto setup, you can use the simulator to see how the bot would have performed with the parameters you have set, using historical data. This is a great way to test out different strategies before committing to them. Note that the historical data does lack some of the volatility that is present in the real market, so the results will not be 100% accurate.

### Auto Fee Detection

Coinbot will check the current fees for the connected account and adjust the numbers in the calculator to match. This makes it easier to calculate profits before starting a trade-pair. When calculating profits, Coinbot will use the exact fees reported by coinbase, which accounts for moving into different fee tiers, or instances where a taker fee was charged.

### Total Profit Estimation

There is an estimation of how much "profit" the bot has generated for different durations of time. This is a total of the difference between the buy and sell values minus the fees for all trade-pairs that have completed a full buy/sell cycle. It is not reflective of how much money is in your account, nor is it reflective of capital gains in the eyes of the IRS. Do not use this info when reporting taxes. Coinbot is unable to assist you with your taxes in any way.

### Open Order Book

A list of all open orders is shown as the main content of the page. This list will update live as the bot makes trades. Coinbase only allows a certain number of orders to be placed at any time, so the bot handles synchronization automatically and shows you your full order book. This will look different from what is reported by Coinbase, which is why trading on the Coinbase platform directly should be avoided when using the coinbot. Trades that are currently synched with Coinbase will be marked with a green dot on the right side of the row. Trades that are not synched will show a blue dot.

### Profit Reinvestment

Users can set a percentage of profits from each trade-pair that will be automatically reinvested back into the pair.

This makes for an interesting strategy because the bot will reinvest profits right around the price that the coin is actively trading at, potentially increasing returns faster than if the profit was spread out evenly among all active trade pairs.

This can be above 100%, which can help distribute a new deposit amongst many trades that have already been placed. Setting a 'reserve' amount in the Investment tab in the settings will attempt to stop reinvestment if the available balance goes below the reserve amount. There are unavoidable situations where the available balance may go below the reserve, so it is best to set this value above 0 if reinvestment is set above 100%.

A maximum trade size can also be set, and the bot will adjust the reinvestment behavior on a trade-pair when it reaches this value. This can be a different reinvestment value, or nothing and the bot will keep the profits.

### Multi-user Authentication

The bot can handle multiple users at once. The first user created will be the admin and can approve and manage the other users. Users will not be allowed to trade until they are approved by the admin.

Stress testing the server capacity is difficult due to the way Coinbase handles API access, so it is currently unknown how many users can be supported at once. The bot can be slowed down to lower system resource usage, so potentially thousands if not accounting for bandwidth constraints or attack vectors. But this is not the intended usage. Better to just keep it to yourself and a few friends.

### Admin Controls

The admin account can control settings that affect resource usage, as well as approving or deleting users.

## `Important notes`

- The coinbot will detect any trading action placed on the Coinbase website manually from the connected Coinbase account, and cancel those orders if they are for products that the coinbot is actively trading. Orders cannot be placed or deleted on Coinbase. That must be done from the coinbot interface. Unfortunately, Coinbase Advanced does not currently support multiple portfolios, but this feature is in beta. Once supported, it is recommended to create a separate portfolio exclusively for the coinbot to avoid any conflicts with manual trading.

# `Setup`

## Prerequisites

Before you get started, make sure you have the following software installed on your computer:

- [Node.js](https://nodejs.org/en/) - version 20
- [PostrgeSQL](https://www.postgresql.org/) - currently using version 14, but nothing is very db fancy so other versions probably work just fine
- [Nodemon](https://nodemon.io/) - You can install this globally with `npm install -g nodemon`. It is used by the dev scripts
- [PM2](https://pm2.keymetrics.io/) - optional, for running in a production environment

### Database

Postgresql should be setup and a new database should be created with the name "coinbot". There is a database.sql file that can be used to generate the required tables.

### Environment Variables

- Environment variables will need to be set. There is an example .env file in the server directory named 'env'. Change the name to '.env', and change the values appropriately, or you can set the variables in your OS if you prefer. Server session secret should be a long string that is not easily guessed, as it is used to identify sessions. If you do not change it, anyone with this repo will be able to guess it. Setting the NODE_ENV variable to 'production' will generate a cryptographically sound string for you. This will log out any users every time the bot is restarted, but is more secure. But very annoying if you run in an unstable vm that constantly restarts.

## Server Scripts

In the server directory, you can run:

### `npm run dev` in the server directory

Runs the server with nodemon to watch the files and restart on changes.\
This is ideal for development, but can cause problems with trade duplication if restarted when maintenance mode is off.

### `npm run server` in the server directory

Runs the express server in the backend.\
This is where the coinbot lives, and must be done.\
This will call the server in plain node.js. You can choose your own daemon.

### `npm run pm2server` in the server directory

Beginner friendly production script.\
Runs the server as a background process so it will continue to run even if you close the terminal.\
You should only run this once, or you will have multiple instances running.\
The included script contains the configuration for pm2, but you will need to configure PM2 for persistence etc to your liking.\
Note that this script is not set to watch the files for changes, so you will need to restart the process manually if you make changes to the production server. But you should not be doing that anyway.\
PM2 is not required, but it is nice for production environments and does not require configuration of systemd or other daemons.\
you can learn more about PM2 [here](https://pm2.keymetrics.io/).

#### \# Note about server scripts \#

There is a package for building .xlsx files that is... not easy on ram when dealing with the quantity of data in the coinbot. The server scripts take that into account, allocating ~8GB of ram to the node.js process. Honestly this is horrible and I'll find another solution at some point, but for now you will need to change the script for devices with less ram. The server will crash if it runs out of memory, so be careful about file exports with this. It can also crash if a large number of people are generating exports at the same time. I can't stress enough that you should not run this app in a public facing production environment.

## Client Scripts

### `npm run dev` in the client directory

Runs the client in development mode.\
NOT TO BE CONFUSED WITH THE SERVER DEV SCRIPT. Make sure you are in the client directory.\
When the rewrite is complete, the server scripts will be moved to the server directory to avoid confusion.\
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.\
you can also run `npm run dev -- --host` to make the server available on your local network.

### `npm run build` in the client directory

Builds the client for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

### `npm run lint`

Runs the linter on the client code. This is not automatically run on the dev script, so you will need to run it occasionally unless your editor is configured to do it for you.

### `npm run preview`

Runs the client in production mode to preview the build locally.\

# Technologies used

- Node.js
- Express.js
- Postgresql and PG
- React
- Vite
