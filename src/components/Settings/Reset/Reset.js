import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext.js';
import { useUser } from '../../../contexts/UserContext.js';
import Confirm from '../../Confirm/Confirm.js';
import './Reset.css'


function Reset() {
  const { user, refreshUser, deleteYourself } = useUser();
  const { resetProfit } = useData();

  const [deleting, setDeleting] = useState(false);

  async function deleteUser() {
    await deleteYourself(user.id);
    refreshUser();
  }

  function cancelDeleteUser(params) {
    setDeleting(false)
  }

  function confirmDelete() {
    setDeleting(true)
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
      <button className={`btn-blue medium ${user.theme}`} onClick={() => { resetProfit('data') }}>Reset Profit</button>

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