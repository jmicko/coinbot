const robot = require('./robot');
const theLoop = require('./theLoop');

// toggle coinbot on and off
function toggleCoinbot() {
  // toggle coinbot boolean
  // if the bot should now be trading, it starts the loop
  if (robot.canToggle) {
    console.log('it can toggle!');
    if (robot.looping) {
      console.log('turning off');
    } else {
      console.log('turning on');
    }
    // the /trade/toggle route will set canToggle to false as soon as it is called so that it 
    // doesn't call the loop twice. The loop will set it back to true after it finishes a loop
    robot.canToggle = !robot.canToggle;
    robot.looping = !robot.looping;
    robot.loop = 0;

    theLoop()
  } else {
    console.log('it cannot toggle!', robot.canToggle);
  }
}

module.exports = toggleCoinbot;