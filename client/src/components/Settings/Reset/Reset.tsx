import { useState } from 'react';
import { useUser } from '../../../hooks/useUser.js';
import Confirm from '../../Confirm/Confirm.js';
import Collapser from '../../Collapser/Collapser.js';


function Reset() {
  const { user, theme, deleteYourself } = useUser();


  const [deleting, setDeleting] = useState(false);

  async function deleteUser() {
    await deleteYourself();
  }

  function cancelDeleteUser() {
    setDeleting(false)
  }

  function confirmDelete() {
    setDeleting(true)
  }

  return (
    <div className="Reset settings-panel scrollable">

      {deleting && <Confirm execute={deleteUser} ignore={cancelDeleteUser} />}

      {/* RESET PROFIT */}
      <div className={`divider ${theme}`} />
      {/* <h4>Reset Profit</h4> */}


      {/* DELETE OWN ACCOUNT */}
      <div className={`divider ${theme}`} />
      {/* <h4>Delete Account</h4> */}
      <Collapser title='Delete Account' >
        <div className='left-border'>
          <p>Danger! This button will instantly and permanently delete your account
            and all user data including trades! Press it carefully!</p>
          {(deleting === true)
            ? <p>Confirming...</p>
            : <button
              className={`btn-red medium ${user.theme}`}
              onClick={() => { confirmDelete() }}
            >Delete Account</button>
          }
        </div>
      </Collapser>

      <div className={`divider ${theme}`} />
    </div>
  );
}

export default Reset;