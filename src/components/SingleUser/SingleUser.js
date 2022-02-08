import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import Confirm from '../Confirm/Confirm';
import './SingleUser.css'

function SingleUser(props) {
  const dispatch = useDispatch();
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);

  function deleteUser() {
    dispatch({
      type: 'DELETE_USER', payload: {
        id: props.user.id,
        fromAdmin: true
      }
    })
  }

  function cancelDeleteUser(params) {
    setDeleting(false)
    // deleteUser()
  }
  
  function approveUser() {
    setApproving(true)
    dispatch({
      type: 'APPROVE_USER', payload: {
        id: props.user.id,
      }
    })
  }
  
  function confirmDelete(params) {
    setDeleting(true)
    // deleteUser()
  }
  
  return (
    <div className={`Single-trade`}>
      {deleting && <Confirm execute={deleteUser} ignore={cancelDeleteUser} />}
      <div className={"overlay"}>
        {/* Delete a user */}
        {(deleting === true)
          ? <p className="deleting">Deleting...</p>
          : <button className="btn-red deleting" onClick={() => { confirmDelete() }}>Delete</button>
        }

        {/* Approve a user */}
        {(props.user.approved)
          ? <p className="deleting">Approved</p>
          : (approving === true)
            ? <p className="deleting">Approving...</p>
            : <button className="btn-green deleting" onClick={() => { approveUser() }}>Approve</button>
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
    </div>
  )
}

export default connect(mapStoreToProps)(SingleUser);