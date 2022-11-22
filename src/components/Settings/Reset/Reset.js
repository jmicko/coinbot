import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Confirm from '../../Confirm/Confirm';
import './Reset.css'


function Reset() {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);

  const [deleting, setDeleting] = useState(false);

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
        id: user.id,
      }
    })
  }

  function cancelDeleteUser(params) {
    setDeleting(false)
    // deleteUser()
  }

  function confirmDelete() {
    setDeleting(true)
    // deleteUser()
  }

  return (
    <div className="Reset settings-panel scrollable">
      {/* <center>
        <p>Reset Settings Page</p>
      </center> */}
      {deleting && <Confirm execute={deleteUser} ignore={cancelDeleteUser} />}

      {/* RESET PROFIT */}
      <div className="divider" />
      <h4>Reset Profit</h4>
      <p>This will start the profit calculation back at $0</p>
      <p>Last reset at: {new Date(user.profit_reset).toLocaleString('en-US')}</p>
      <button className={`btn-blue medium ${user.theme}`} onClick={() => { resetProfit() }}>Reset Profit</button>

      {/* DELETE OWN ACCOUNT */}
      <div className="divider" />
      <h4>Delete Account</h4>
      <p>Danger! This button will instantly and permanently delete your account and all user data including trades! Press it carefully!</p>
      {(deleting === true)
        ? <p>Confirming...</p>
        : <button className={`btn-red medium ${user.theme}`} onClick={() => { confirmDelete() }}>Delete Account</button>
      }

      <div className="divider" />
    </div>
  );
}

export default Reset;