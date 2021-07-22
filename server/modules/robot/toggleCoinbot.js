const botStatus = require('./botStatus');
const theLoop = require('./theLoop');
// const botStatus = require('./botStatus');
// toggle coinbot on and off
const toggleCoinbot = () => {
    // toggle coinbot boolean
    botStatus.toggle = !botStatus.toggle;
    // if the bot should now be coinbot, it starts the trade loop
    botStatus.toggle
      ? theLoop()
      : console.log('bot is not coinbot');
  }

  module.exports = toggleCoinbot;