# Task list

## Front end
- [] display all currently open trades
- [] input for new price point to auto trade at
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
    - ### buy function
        - [] set up buy function
        - [] take in a price to make initial purchase
        - [] send purchase order to coinbase
        - [] store returned order ID, type of transaction (buy/sell), order status, and purchase price in db
    - ### trade loop function
        - [] set "watch" variable to true
        - [] wait one minute and check on order
            - [] if order has gone through:
                - [] set "sold" variable to true 
                - [] initiate sell order with sell function

    - ### sell function

    - ###
        set "watch" variable (stored in backend) to "true" initiate trade loop function to watch order status and wait for transaction to go through