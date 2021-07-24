

# Coinbot

Bitcoin trading bot built for the Coinbase Pro cryptocurrency exchange. Strategy is built on the creation of a trade-pair. Two order price positions, a buy price and a sell price, are tied together in the coinbot's database. The bot keeps track of which "side" is currently on order on Coinbase. When the coinbot detects a trade has settled on the exchange, it flips sides on the trade.

## DISCLAIMER
This is an experimental bot. It requires a connection to a Coinbase Pro account, and has the ability to handle real money. Coinbase provides a sandbox API for testing purposes. It is recommended only to use the sandbox API with this bot as a demonstration of what is possible with the Coinbase API. Any use of the software provided in this repository is the responsibility of the user, and the developers of the software cannot be held responsible for any financial operations made with the software, or harm done to your computer as a result of using the software. Use of this software does not come with any guarantee of profits, losses, fees, taxes, or other financial consequences. Bitcoin and other cryptocurrencies may be taxed. Trading cryptocurrency is a risk taken by those making the trades. No financial advice is given in regards to the use of this software.

You trade at your own risk.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## `Features`

### Create new trade pairs

## `Important notes`
- In it's current state, there is no option to cancel an order from the Coinbot app. Coinbot also does not have a way to detect if an order has been canceled from the coinbase website. If that happens, Coinbot will throw an error and will either stop, or continue checking the cancelled order and throwing the error.

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

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

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

