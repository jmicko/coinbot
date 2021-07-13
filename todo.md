# Task list

## Front end
- [] display currently available funds
- [] display all currently open trades
    - [] current side (buying/selling)
    - [] size in btc and usd
    - [] high price (to sell at)
    - [] low price (to buy at)
    - [] cancel button to abandon position
        - triggers cancel function on backend
    - example: `<buying 0.001 BTC for $32 -- high: 32,000 -- low: 31,000 -- [CANCEL] >`
        - this will show which prices the bot is bouncing between
- [] input for new price point to auto trade at
    - mannually triggers transaction function on backend
    - initially this will assume an abundance of USD, and trigger a buy transaction.
    - Stretch goal: add buy and sell buttons to account for either an abundance of USD or BTC
    - Stretch goal: bot will occasionally check available account balances against current market values, and if there is enough surplus of USD or BTC, will automatically trigger a buy or sell transaction respectively. This allows for automatic deposits from a bank or bitcoin miner to be taken care of effortlessly by the bot at current prices, which are most likely to be profitable. This feature should be able to toggle on and off.
- [] toggle to turn trading on and off
    - [] send POST request to server to handle toggle and trade loop function
- [] display current trading status. Maybe should be combined with trading toggle by toggling button color between green and red.


## Back end
- [x] connect to coinbase API
- [] set up db
    - [x] connect to db
    - [] user table to store sensitive encrypted info. For now this is stored in a .env
        - [] username
        - [] API key
        - [] API password
        - [] API secret
    - [] orders table to store all orders that have been placed
        - [] id (string, taken from CB API response after order is placed)
        - [] price (string)
        - [] size (string)
        - [] side (string)
        - [] settled (boolean)
- [] set up auto trader
    - ### transaction function
        - [] takes in a price param (number as a string) and side param (buy/sell) to make purchase
        - [] send order to coinbase
        - [] store returned order ID, side (type of transaction, either buy/sell), status, and price in db
    - ### trade loop function
        - [] check if "watch" variable is true. If false, end the loop
        - [] wait 5 seconds and check on orders
            - [] pull all open orders from db and loop through each one
            - [] request order info from Coinbase (CB) API based on order ID from DB
            - [] compare order settled from CB to order status in DB. If order has gone through:
                - [] initiate opposite type of sale (sell/buy) order with sell function. So if a buy was just detected as complete, initiate a sell. If a sell was completed, initiate a buy.
                    - if selling was completed, divide original order's sale price by 1.03 to get the price for the new buy order. This will create a buy at 3% lower cost than the sale that was just made.
                    - if buying was completed, multiply the original order's purchase price by 1.03 for a new sale price that is 3% higher.
                - [] set status for that order ID in DB to complete. this needs to happen last so if there is an error creating the new order, the function will just check on it later
                    - if order has not gone through, just ignore and loop to next order. No 'else' statement.

    - ### sell function
        - [] takes in a price param to make sale
        - [] send purchase order to coinbase
        - [] store returned order ID, side (type of transaction, either buy/sell), status, and price in db

    - ### cancel position function
        - [] take in an order ID param
        - [] send cancel order to CB
        - [] after server sends success response, delete the row with that order ID from the DB.

    - ### control for turning bot on and off
        - [] set up POST route at trade/toggle
            - [] when route is hit, toggle "watch" variable between true/false. Aka, watch = !watch
            - [] if watch is true, call trade loop function to watch order status and wait for transaction to go through