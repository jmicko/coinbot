const botStatus = require('./botStatus');
const theLoop = require('./theLoop');

// toggle coinbot on and off
function toggleCoinbot() {
    // toggle coinbot boolean
    botStatus.toggle = !botStatus.toggle;
    // if the bot should now be trading, it starts the loop
    if(botStatus.toggle){
        theLoop()
    } else {
        botStatus.loop = 0;
    }
}

module.exports = toggleCoinbot;