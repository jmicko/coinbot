// take in an array and an item to check
function orderElimination (dbOrders, cbOrders) {
    for (let i = 0; i < cbOrders.length; i++) {
      // look at each id of coinbase orders
      const cbOrderID = cbOrders[i].id;
      // console.log(cbOrderID);
      // filter out dborders of that id
      dbOrders = dbOrders.filter(id => {
        return (id.id !== cbOrderID)
      })
    }
    return dbOrders;
  }

  module.exports = orderElimination;