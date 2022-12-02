const rejectUnauthenticated = (req, res, next) => {
  // check if logged in
  if (req.isAuthenticated()) {
    // They were authenticated! User may do the next thing
    // Note! They may not be Authorized to do all things
    next();
  } else {
    // failure sends a forbidden status code
    res.send(`You never should have come here! >:|`).status(403);
  }
};

// sockets authenticate once on connection, and maintain that auth until disconnected
// this authentication comes from wrapping the passport middleware around the socket
const rejectUnauthenticatedSocket = (socket, next) => {
  // check if logged in
  if (socket.request?.isAuthenticated()) {
    // They were authenticated! User may do the next thing
    // Note! They may not be Authorized to do all things
    next();
  } else {
    // socket middleware always needs next or the connection will just hang
    // if not authenticated, throw an 
    next(new Error("not authenticated"));
    console.log('socket auth failed');
  }
};

module.exports = { rejectUnauthenticated, rejectUnauthenticatedSocket };
