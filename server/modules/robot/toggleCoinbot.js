const botStatus = require('./botStatus');
const theLoop = require('./theLoop');

// toggle coinbot on and off
function toggleCoinbot() {
    // toggle coinbot boolean
    botStatus.toggle = !botStatus.toggle;
    // if the bot should now be coinbot, it starts the trade loop
    botStatus.toggle
        ? theLoop()
        : console.log('bot is not coinbot');
}

module.exports = toggleCoinbot;