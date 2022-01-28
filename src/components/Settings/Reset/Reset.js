import React from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './Reset.css'


function Reset(props) {
  const dispatch = useDispatch();

  // delete the order if the abandon button is clicked.
  // the loop already detects deleted orders, so only need to make a call to coinbase
  // no need to bother the database if it is busy

  function resetProfit(event) {
    // event.preventDefault();
    dispatch({
      type: 'RESET_PROFIT',
    });
  }

  function deleteUser() {
    // setDeleting(true)
    dispatch({
      type: 'DELETE_USER', payload: {
        id: props.store.accountReducer.userReducer.id,
      }
    })
  }

  return (
    <div className="Reset settings-panel scrollable">
      {/* <center>
        <p>Reset Settings Page</p>
      </center> */}

      {/* RESET PROFIT */}
      <div className="divider" />
      <h4>Reset Profit</h4>
      <p>This will start the profit calculation back at $0</p>
      <p>Last reset at: {new Date(props.store.accountReducer.userReducer.profit_reset).toLocaleString('en-US')}</p>
      <button className={`btn-blue medium ${props.theme}`} onClick={() => { resetProfit() }}>Reset Profit</button>

      {/* DELETE OWN ACCOUNT */}
      <div className="divider" />
      <h4>Delete Account</h4>
      <p>Danger! This button will instantly and permanently delete your account and all user data including trades! Press it carefully!</p>
      <button className={`btn-red medium ${props.theme}`} onClick={() => { deleteUser() }}>Delete Account</button>

      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(Reset);