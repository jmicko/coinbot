import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '../../contexts/UserContext';
import Confirm from '../Confirm/Confirm';
import './SingleUser.css'

function SingleUser(props) {
  const dispatch = useDispatch();
  // IMPORTANT to not that this is the user from the context, not the user from the props
  // This is the user that is logged in
  const { user } = useUser();
  const debugReducer = useSelector((store) => store.accountReducer.debugReducer);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // functions passed in from the parent
  const deleteUser = () => props.deleteUser(props.user.id);
  const approveUser = () => props.approveUser({ id: props.user.id });

  function toggleShowAll() {
    setShowAll(!showAll);
  }


  function cancelDeleteUser(params) {
    setDeleting(false)
  }

  function confirmDelete(params) {
    setDeleting(true)
  }

  function debug() {
    dispatch({
      type: 'DEBUG',
      payload: {
        id: props.user.id
      }
    })
  }

  return (
    <div className={`Single-trade`}>
      <button className={`btn-blue expand-single-trade ${user.theme}`} onClick={toggleShowAll}>{showAll ? <>&#9650;</> : <>&#9660;</>}</button>
      {showAll && <button className={`btn-blue expand-single-trade ${user.theme}`} onClick={debug}>debug</button>}
      {deleting && <Confirm execute={deleteUser} ignore={cancelDeleteUser} />}
      <div className={"overlay"}>
        {/* Delete a user */}
        {(deleting === true)
          ? <p className="deleting">Deleting...</p>
          : <button className="btn-red deleting" onClick={() => { confirmDelete() }}>Delete</button>
        }

        {/* Approve a user */}
        {!deleting && ((props.user.approved)
          ? <p className="deleting">Approved</p>
          : (approving === true)
            ? <p className="deleting">Approving...</p>
            : <button className="btn-green deleting" onClick={() => { approveUser() }}>Approve</button>)
        }
        {/* User details */}
        <p className="single-trade-text">
          <strong>
            ID: </strong>
          {props.user.id}
          ~ <strong>
            Username: </strong>
          {props.user.username}
          ~ <strong>Active: </strong>
          {JSON.stringify(props.user.active)}
          {/* ~ <strong>Approved: </strong>{ }
          {JSON.stringify(props.user.approved)} */}
        </p>
      </div>
      {showAll &&
        <div className='user-info'>
          {/* BOT STATUS LIST */}
          <h4>User Bot Status</h4>
          <ol>
            <li>Loop #{debugReducer[props.user.userID]?.loopNumber}</li>
            {/* <p>{JSON.stringify(}</p> */}
            {debugReducer[props.user.userID]?.botStatus.slice(0).reverse().map((statusItem, i = 1) => {
              i++
              return <li key={i}>{statusItem}</li>
            }) || <p>Click debug to get info. This will return a snapshot of the user, and does not update live.</p>}
          </ol>
          {/* <h4></h4> */}
        </div>
      }
    </div>
  )
}

export default SingleUser;