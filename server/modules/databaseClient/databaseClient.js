const storeTrade = require('./storeTrade');
const getUnsettledTrades = require('./getUnsettledTrades');

const databaseClient = {
    storeTrade : storeTrade,
    getUnsettledTrades : getUnsettledTrades
}

module.exports = databaseClient;