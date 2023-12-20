import { useEffect, useState } from 'react';
import { useUser } from '../../../contexts/useUser';
import Confirm from '../../Confirm/Confirm.js';
import './Reset.css'
import usePutFetch from '../../../hooks/usePutFetch.js';
import { useData } from '../../../contexts/useData.js';
import { DotLoader, SpaceLoader, WaveLoader } from '../../Loading.js';


function Reset(props: { tips: boolean }) {
  const { productID, refreshProfit } = useData();
  const { user, theme, refreshUser, deleteYourself, clearUser } = useUser();
  const {
    putData: resetProfit,
    isLoading: resetLoading,
  } = usePutFetch({
    url: `/api/account/profit/${productID}`,
    refreshCallback: () => { refreshProfit(), refreshUser() },
    loadingDelay: 1000,
    from: 'resetProfit in Reset',
  })

  const [deleting, setDeleting] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  async function deleteUser() {
    await deleteYourself();
    clearUser();
    refreshUser();
  }

  function cancelDeleteUser() {
    setDeleting(false)
  }

  function confirmDelete() {
    setDeleting(true)
  }

  function convertDate(dateString: string) {
    // convert date to mm/dd/yyyy
    const date = new Date(dateString).toISOString().slice(0, 10)
    const dateArray = date.split('-');
    const year = dateArray[0];
    const month = dateArray[1];
    const day = dateArray[2];
    return `${month}/${day}/${year}`;
  }

  return (
    <div className="Reset settings-panel scrollable">

      {deleting && <Confirm execute={deleteUser} ignore={cancelDeleteUser} />}

      {/* RESET PROFIT */}
      <div className={`divider ${theme}`} />
      <h4>Reset Profit</h4>
      {props.tips &&
        <p>
          This will start the profit calculation back at $0, starting from midnight on the
          given date.
        </p>
      }
      <p>Last reset on: {convertDate(user.profit_reset)}</p>
      <input
        type="date"
        value={new Date(newDate).toISOString().slice(0, 10)}
        onChange={(e) => { setNewDate(e.target.value) }}
      />
      &nbsp;
      {resetLoading
        ? <WaveLoader />
        :
        <button
          className={`btn-blue medium ${user.theme}`}
          onClick={() => { resetProfit({ profit_reset: newDate }) }}
        >Reset Profit</button>

      }

      {/* DELETE OWN ACCOUNT */}
      <div className={`divider ${theme}`} />
      <h4>Delete Account</h4>
      <p>Danger! This button will instantly and permanently delete your account
        and all user data including trades! Press it carefully!</p>
      {(deleting === true)
        ? <p>Confirming...</p>
        : <button
          className={`btn-red medium ${user.theme}`}
          onClick={() => { confirmDelete() }}
        >Delete Account</button>
      }

      <div className={`divider ${theme}`} />
    </div>
  );
}

export default Reset;