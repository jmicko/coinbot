import React from 'react';
import { useData } from '../../contexts/DataContext';
import './NotApproved.css'




function NotApproved() {
  const { user } = useData();

  return (
    <div className="NotApproved scrollable boxed">
      {/* <div className="scrollable boxed"> */}
        {/* <>{JSON.stringify(props.store.accountReducer)}</> */}
        <center><p>Welcome to coinbot, {user.username}!</p></center>
        <center><p>You are not approved yet.</p></center>
        <center><p>An admin must approve you first. For now, go ahead and Make sure you store your
          API details from Coinbase. You can do this in the settings. As soon as you are approved,
          the coinbot will be here to greet you. Once you've been approved and have stored your API
          details, you will be able to trade the coin.</p></center>
        <center><p>Good Luck!</p></center>
      {/* </div> */}
    </div>
  )
}

export default NotApproved;