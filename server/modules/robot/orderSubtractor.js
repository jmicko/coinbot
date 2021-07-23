// take in an array and an array to subtract
function orderSubtractor (orderArray, ordersToSubtract) {
    for (let i = 0; i < ordersToSubtract.length; i++) {
      // look at each id of coinbase orders
      const cbOrderID = ordersToSubtract[i].id;
      // filter out dborders of that id
      orderArray = orderArray.filter(id => {
        return (id.id !== cbOrderID)
      })
    }
    // send back the first array with all orders that exist in both removed
    return orderArray;
  }

  module.exports = orderSubtractor;