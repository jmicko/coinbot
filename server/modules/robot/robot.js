const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const robot = {
    // the /trade/toggle route will set canToggle to false as soon as it is called so that it 
    // doesn't call the loop twice. The loop will set it back to true after it finishes a loop
    canToggle : true,
    looping : false,
    loop : 0,
    busy : 0,
    // store an array of orders that need to be updated after filling
    updateSpool : [],
    sleep: sleep,
}    


module.exports = robot;