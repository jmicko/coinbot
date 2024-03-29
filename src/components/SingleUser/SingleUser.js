import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext.js';
import { useFetchData } from '../../hooks/fetchData.js';
import Confirm from '../Confirm/Confirm.js';
import './SingleUser.css'

function SingleUser(props) {
  // IMPORTANT to not that this is the user from the context, not the user from the props
  // This is the user that is logged in
  const { user } = useUser();

  const approveUserChat = () => { props.approveUserChat({ id: props.user.id, chatPermission: !props.user.can_chat }) };

  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // functions passed in from the parent
  const deleteUser = () => props.deleteUser(props.user.id);
  const approveUser = () => {
    setApproving(true);
    props.approveUser({ id: props.user.id })
  };
  const { data: debugData, refresh: debug } = useFetchData(`api/admin/debug/${props.user.id}`, { defaultState: [] });


  function toggleShowAll() {
    setShowAll(!showAll);
  }


  function cancelDeleteUser(params) {
    setDeleting(false)
  }

  function confirmDelete(params) {
    setDeleting(true)
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
        {/* ddd{props.user.can_chat ? 'chat' : "no"}chat */}
        {/* Approve a user */}
        {!deleting && ((props.user.approved)
          ? <p className="deleting">Approved</p>
          : (approving === true)
            ? <p className="deleting">Approving...</p>
            : <button className="btn-green deleting" onClick={() => { approveUser() }}>Approve</button>)
        }
        {/* Enable chat for a user */}
{/* {JSON.stringify(props.user)} */}
        {(props.user.can_chat
          ? <button className="btn-red deleting" onClick={() => { approveUserChat() }}>Remove Chat</button>
          : <button className="btn-green deleting" onClick={() => { approveUserChat() }}>Approve Chat</button>)
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
            <li>Loop #{debugData?.loopNumber}</li>
            {/* <p>{JSON.stringify(}</p> */}
            {debugData?.botStatus.slice(0).reverse().map((statusItem, i = 1) => {
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