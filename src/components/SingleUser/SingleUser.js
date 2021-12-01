import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './SingleUser.css'

function SingleUser(props) {
  const dispatch = useDispatch();
  const [deleting, setDeleting] = useState(false);

  function deleteUser() {
    console.log('clicked delete', props.user.id);
    setDeleting(true)
    dispatch({
      type: 'DELETE_USER', payload: {
        id: props.user.id,
      }
    })
  }

  return (
    <div className={`Single-trade`}>
      <div className={"overlay"}>
        {(deleting === true)
          ? <p className="deleting">Deleting...</p>
          : <button className="btn-red deleting" onClick={() => { deleteUser() }}>Delete</button>
        }
        <p className="single-trade-text">
          <strong>
            Username: </strong>
          {(props.user.username === 'sell')
            ? props.user.username
            : props.user.username
          } ~ <strong>Active: </strong>
          {JSON.stringify(props.user.active)}
          ~ <strong>Approved: </strong>{}
          {JSON.stringify(props.user.approved)}
        </p>
      </div>
    </div>
  )
}

export default connect(mapStoreToProps)(SingleUser);