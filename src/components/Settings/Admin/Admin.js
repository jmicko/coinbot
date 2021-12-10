import React, { useState, useEffect, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import SingleUser from '../../SingleUser/SingleUser';
import './Admin.css'


function Admin(props) {
  const dispatch = useDispatch();

  const getUsers = useCallback(
    () => {
      console.log('getting users');
      if (props.store.accountReducer.userReducer.admin) {
        dispatch({ type: 'FETCH_USERS' })
      }
    }, [dispatch]
  )

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <div className="Admin">
      <center>
        <p>Admin Settings Page</p>
      </center>
      {(props.store.accountReducer.userReducer.admin)
        ? <div>
          <h4>Manage Users</h4>
          {props.store.usersReducer.allUsersReducer.map((user) => {
            return <SingleUser key={user.id} user={user} />
          })}
          {/* {JSON.stringify(props.store.usersReducer.allUsersReducer)} */}
        </div>
        : <></>
      }
      {(props.store.accountReducer.userReducer.admin)
        ? <>
          <h4>Factory Reset</h4>
          <p>
            This will delete everything! Use with caution!
          </p>
          <p>
            CAUTION <button
              className="btn-logout btn-red"
              onClick={() => dispatch({ type: 'FACTORY_RESET' })}
            >
              Factory Reset
            </button> CAUTION
            CAUTION <button
              className="btn-logout btn-red"
              onClick={() => dispatch({ type: 'ORDERS_RESET' })}
            >
              Reset Orders Table
            </button> CAUTION
          </p>
        </>
        : <></>
      }
    </div>
  );
}

export default connect(mapStoreToProps)(Admin);