

# Coinbot

Coinbot is a Bitcoin trading bot project built for the Coinbase Pro cryptocurrency exchange. 

The strategy is based on the creation of trade-pair values. A trade-pair is the combination of two precalculated order price positions, a "buy" price and a "sell" price, that are stored in the coinbot's local database. The buy price should always be lower than the sell price, and the difference between the two should cover the cost of exchange fees. The bot keeps track of which "side" (buy or sell) is currently on order on Coinbase. each order is stored locally with the original buy and sell values. When the coinbot detects a trade has settled on the exchange, it flips sides on the trade by creating a new trade on the other side. 

So when a "buy" is settled, another order will immediately be placed as a "sell". The prices of each of these orders are stored as the values of the trade-pair. When a buy order and a sell order each go through from the same trade-pair values, a profit is made. The two transactions that contributed to the profit are the trade-pair. The volume of the trade-pair does not matter so much, as fees are calculated by percentage. A smaller volume allows for greater distribution of trade-pair positions.

Placing dozens of trade-pairs at many different price points allows the bot to capture smaller but more frequent profits. The huge price swings that occasionaly make someone rich are notable in their own light, but do not happen frequently at all when compared to the smaller $400 - $3,000 swings that happen on a daily basis. The coinbot does not care, and allows for both of these strategies to work.

For example: A trade-pair could be set up between the prices of $10,000 and $100,000, and return a huge profit if the price of Bitcoin hits both sides. Or it could be set up between $30,000 and $31,000 for much smaller, but more frequent profits as the price staggers past them. In testing, the latter strategy has shown to be effective.

But again, the coinbot does not care. Nor do the developers. 

However, a higher amount of open trades does increase the amount of processing done by the bot. The effects of this are unknown, but this is not a high-speed bot on a Wall Street exchange. It was made for a slow and unreliable home internet connection. On that note, one of the developers uses a satellite connection (Starlink) and a Raspberry Pi. It hasn't been an issue. The bot keeps local copies of the trades it makes, places limit orders, and does not rely on the ability to react quickly to incoming market data. If the internet connection is cut off, the limit orders will still go through on Coinbase, and the will simply check and react to them later when the internet is restored.

## `DISCLAIMER`

This is an experimental bot. It requires a connection to a Coinbase Pro account, and has the ability to handle real money. Coinbase provides a sandbox API for testing purposes. It is recommended only to use the sandbox API with this bot as a demonstration of what is possible with the Coinbase API. Any use of the software provided in this repository is the responsibility of the user, and the developers of the software cannot be held responsible for any financial operations made with the software, or harm done to your computer as a result of using the software. Use of this software does not come with any guarantee of profits, losses, fees, taxes, or other financial consequences. Bitcoin and other cryptocurrencies may be taxed. Trading cryptocurrency is a risk taken by those making the trades. No financial advice is given in regards to the use of this software. 

You trade at your own risk.

There are also currently no security features built in to the coinbot. DO NOT host it in the cloud or on any device that can be accessed from the internet, from the intranet, or by anyone who you do not want to be able access it.

## Advantages

This is a fairly low-risk strategy, as it requires no statistical analisys or market data. There is no risk of guessing trends incorrectly because the coinbot does not guess. It works off of predetermined prices. Profits are made when the price of Bitcoin passes the "buy" and "sell" prices of a trade-pair in that order. If left alone, the coinbot will do this automatically at the set price points as long as the price of bitcoin is hitting them. The coinbot actually benefits from higher volitility and large fast price swings because it increases the chances that the trade-pair values will be hit.

## Disadvantages

A notable disadvantage of this strategy is that when the price takes an upward trend, the coinbot will sell at a fixed price regardless. This slows down the potential rate of profits compared to strategies that attempt to calculate the tops of market curves. 

It also does not take into account market volumes, or the bird-themed social media accounts of billionaire entrepreneurs. That's not what this project is about. :bird:

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## `Features`

### Web-based Interface

Use and configuration for the coinbot is done from a 

### Create New Trade Pairs

New trade-pair values can be created from the interface. There is a calculator to determine both sides of the trade-pair, and estimate fees and profits. Note that these are an estimation, and nothing is guaranteed on the behalf of the developers.

### Toggle Bot Button

There is a big red button on the interface for turning the bot on and off. This makes it easy to pause trading if, say, you just need some time to think.

### More to Come
- Total profit estimation
- Live status updates from the coinbot
- List of open orders
- Order cancelation from interface
    - This will notably include auto cancellation, where the bot will wait to cancel the trade-pair if it is a sell order. Buy orders will be canceled immediatly. This ensures that a position will only be cancelled after a profit has been made, and helps to prevent losses due to trading fees.
- Fee adjustment
    - Currently the coinbot uses the .5% fee of the first tier when calculating fees and profits. This will change so that the coinbot will check what the currently connected account fees are, and modify the calculation appropriately.

## `Important notes`
- In it's current state, there is no option to cancel an order from the Coinbot app. Coinbot does, however, detect if an order has been canceled from the coinbase website. When an order is canceled, Coinbase returns a 404 when looking up the status of the trade. If that happens, Coinbot will delete the trade from it's own database.

- The coinbot will not detect new trades placed on Coinbase manually from the connected Coinbase account. It is recommended to create a separate profile on Coinbase exclusively for the coinbot to prevent accidental cancellation of the coinbot's trades.

## `Setup`

### Database
Postgres should be setup and a new database should be created with the name "coinbot". There is a database.sql file that can be used to generate the required tables.

### .env file
- Currently, there is no method to store user information. A .env file should be created at the base of the file tree. Copy the following into the file and replace the info inside the quotes with the correct info for your setup. PG info is the usernamne and password used for access to Postgres. The Coinbase API info can be generated in the API settings on your account profile at public.sandbox.pro.coinbase.com

    PGUSER='postgresUsernameGoesHere'
    PGPASSWORD='postgresPasswordGoesHere'
    SANDBOXKEY='keyGoesHere'
    SANDBOXPASSWORD='passwordGoesHere'
    SANDBOXSECRET='secretGoesHere'


## Available Scripts

In the project directory, you can run:

### `yarn server`

Runs the express server in the backend.\
This is where the coinbot lives, and must be done.

### `yarn start`

Runs the web app interface in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console. Currently, the coinbot must be toggled on from the web interface before it can start trading, even if trade-pairs have already been made. So this also must be done for now.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

