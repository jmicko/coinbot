
// const toggleCoinbot = require('./toggleCoinbot');
// const orderSubtractor = require('./orderSubtractor')
// const flipTrade = require('./flipTrade')

const robot = {
    // the /trade/toggle route will set canToggle to false as soon as it is called so that it 
    // doesn't call the loop twice. The loop will set it back to true after it finishes a loop
    canToggle : true,
    looping : false,
    loop : 0,
    busy : false
}


module.exports = robot;