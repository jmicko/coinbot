const robot = require('./robot');
const theLoop = require('./theLoop');

// toggle coinbot on and off
function toggleCoinbot() {
  // find out if the robot is in a state where it can be toggled. 
  // the bot will not allow toggling unless the previous toggle has been handled.
  // this is because if the toggle is pressed too quickly, it can be toggle off and on
  // all in one loop cycle. The loop will not turn off because it has been toggled back on, 
  // but toggling it back on will call the loop a second time, creating duplicate orders
  if (robot.looping) {
    console.log('turning off');
  } else {
    console.log('turning on');
  }

  // actually, what it should do is toggle it back on, but only call the loop if canToggle is true
  robot.looping = !robot.looping;
  
  if (robot.canToggle) {
    console.log('it can toggle!');
    // if the bot should now be trading, it starts the loop
    theLoop();
    // the /trade/toggle route will set canToggle to false as soon as it is called so that it 
    // doesn't call the loop twice. The loop will set it back to true after it finishes a loop
    robot.canToggle = false;
    robot.loop = 0;
  } else {
    console.log('it cannot toggle!', robot.canToggle);
  }
  // robot.looping = !robot.looping;
}

module.exports = toggleCoinbot;