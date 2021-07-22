const botStatus = require('./botStatus');
const toggleCoinbot = require('./toggleCoinbot');

const robot = {
    botStatus: botStatus,
    toggleCoinbot: toggleCoinbot
}

module.exports = robot;