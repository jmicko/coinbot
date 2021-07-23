// sleeper function to slow down the loop
// can be called from an async function and takes in how many milliseconds to wait
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}
module.exports = sleep;