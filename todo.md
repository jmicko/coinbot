# Task list

## Front end
- [] display all currently open trades
- [] input for new price point to auto trade at
    - triggers manual buy function
- [] toggle to turn trading on and off
    - [] send POST request to server to handle toggle and trade loop function


## Back end
- [x] connect to coinbase API
- [] set up db
    - [x] connect to db
    - [] user table to store sensitive encrypted info. For now this is stored in a .env
        - [] username
        - [] API key
        - [] API password
        - [] API secret
- [] set up auto trader
    - ### transaction function
        - [] takes in a price param (number as a string) and side param (buy/sell) to make purchase
        - [] send order to coinbase
        - [] store returned order ID, side (type of transaction, either buy/sell), status, and price in db
    - ### trade loop function
        - [] check if "watch" variable is true. If false, end the loop
        - [] wait one minute and check on orders
            - [] pull all open orders from db and loop through each one
            - [] request order info from Coinbase (CB) API based on order ID from DB
            - [] compare order status from CB to order status in DB. If order has gone through:
                - [] initiate opposite type of sale (sell/buy) order with sell function. So if a buy was just detected as complete, initiate a sell. If a sell was completed, initiate a buy.
                    - if selling was completed, divide original order's sale price by 1.03 to get the price for the new buy order. This will create a buy at 3% lower cost than the sale that was just made.
                    - if buying was completed, multiply the original order's purchase price by 1.03 for a new sale price that is 3% higher.
                - [] set status for that order ID in DB to complete. this needs to happen last so if there is an error creating the new order, the function will just check on it later

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