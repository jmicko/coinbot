# Task list

## Front end

### Layout

- [x] display currently available funds
- [x] display all currently open trades
  - [x] current side (buying/selling)
  - [x] size in btc and usd
  - [x] high price (to sell at)
  - [x] low price (to buy at)
  - [x] cancel button to abandon position
    - triggers cancel function on backend
    - example: `<buying 0.001 BTC for $32 -- high: 32,000 -- low: 31,000 -- [CANCEL] >`
    - this will show which prices the bot is bouncing between
- [x] input for new price point to auto trade at
  - manually triggers transaction function on backend
  - initially this will assume an abundance of USD, and trigger a buy transaction.
  - Stretch goal: add buy and sell buttons to account for either an abundance of USD or BTC
  - Stretch goal: bot will occasionally check available account balances against current market values, and if there is enough surplus of USD or BTC, will automatically trigger a buy or sell transaction respectively. This allows for automatic deposits from a bank or bitcoin miner to be taken care of effortlessly by the bot at current prices, which are most likely to be profitable. This feature should be able to toggle on and off.
- [x] toggle to turn trading on and off
  - [x] send POST request to server to handle toggle and trade loop function
- [x] display current trading status. Maybe should be combined with trading toggle by toggling button color between green and red.

### Components

## Back end

- [] store autosetup config for repeated use to expand range of coverage

### Database

- [x] set up db
  - [x] connect to db
  - [x] user table to store info. For now this is stored in a .env and is low priority as the bot is not design for a public multi-user scenario, but rather a single computer and one account.
    - [x] username
    - [x] API key
    - [x] API password
    - [x] API secret
  - [x] orders table to store all orders that have been placed
    - [x] id (string, taken from CB API response after order is placed)
    - [x] price (string)
    - [x] size (string)
    - [x] side (string)
    - [x] settled (boolean)

### Routes

- [x] trade/toggle POST - turns the bot on and off
- [x] settings/status GET - handles bot status, available funds, etc
- [x] trade/order POST - sends an order to CB
  - takes in an order price
- [x] trade/order GET - checks on all open orders to display them on screen
- [x] trade/order DELETE - takes in an order ID to be canceled on CB and then deleted from the DB

- ### transaction function

  - [x] set up POST route at api/trade/order
  - [x] takes in a price param (number as a string), a value (number as a string),
  - [x] send order to coinbase
  - [x] store returned order ID, side (type of transaction, either buy/sell), status, and price in db

- ### trade loop function

  - [x] check if "trading" variable is true. If false, end the loop
  - [x] wait n seconds and check on orders
    - [x] pull all open orders from db and loop through each one
    - [x] request order info from Coinbase (CB) API based on order ID from DB
    - [x] check if order settled. If order has gone through:
      - [x] initiate opposite type of sale (sell/buy) order with sell function. So if a buy was just detected as complete, initiate a sell. If a sell was completed, initiate a buy.
        - if selling was completed, divide original order's sale price by 1.03 to get the price for the new buy order. This will create a buy at 3% lower cost than the sale that was just made.
        - if buying was completed, multiply the original order's purchase price by 1.03 for a new sale price that is 3% higher.
      - [x] set status for that order ID in DB to complete. this needs to happen last so if there is an error creating the new order, the function will just check on it later
        - if order has not gone through, just ignore and loop to next order. No 'else' statement.

- ### cancel position function

  - [x] set up DELETE route at api/trade/order/delete
  - [x] take in an order ID param
  - [x] send cancel order to CB
  - [x] after server sends success response, delete the row with that order ID from the DB.
  - [x] if the request fails because the order has already gone through, send error response so an alert can be shown on the front end

- ### control for turning bot on and off

  - [x] set up POST route at api/settings/toggle
    - [x] when route is hit, toggle "trading" variable between true/false. Aka, trading = !trading
    - [x] if trading is true, call trade loop function to watch order status and wait for transaction to go through

### Misc

- [x] connect to coinbase API

## COINBOT 2.0 future features

- ### Fewer API calls

  - [x] Pull all open orders from CB into an array
  - [x] Pull all open orders from DB into a second array
  - [x] Compare both arrays, pop orders out of the DB array if they also exist in the CB array
    - The orders that remain in the DB array will be settled in CB, and can be fed to the loop.
    - This makes much fewer API calls

- ### Trade tier awareness

  - Build logic into the bot to account for different fee pricing tiers
  - possibly adjust the trade-pair margins of all open trades so they adjust for the new position
    - this maybe should be a manual option as it will increase trade volume, but decrease individual trade profit.

- ### Store both original buy and sell positions

  - Running math in JS for pricing is not accurate and could allow the positions to creep
  - [x] upper and lower prices should be calculated before the trade is sent and stored in the DB
  - [x] the loop will reference the stored values for the new trades instead of multiplying and rounding with each trade
    - this should also slightly improve performance because there are fewer calculations per trade
