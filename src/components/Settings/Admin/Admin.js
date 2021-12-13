import React, { useState, useEffect, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import SingleUser from '../../SingleUser/SingleUser';
import './Admin.css'


function Admin(props) {
  const dispatch = useDispatch();
  const [loopSpeed, setLoopSpeed] = useState(1);

  const getUsers = useCallback(
    () => {
      console.log('getting users');
      if (props.store.accountReducer.userReducer.admin) {
        dispatch({ type: 'FETCH_USERS' })
      }
    }, [dispatch]
  )

  const getAllSettings = useCallback(
    () => {
      console.log('getting all settings');
      if (props.store.accountReducer.userReducer.admin) {
        dispatch({ type: 'FETCH_SETTINGS' })
      }
    }, [dispatch]
  )

  function sendLoopSpeed() {
    dispatch({
      type: 'SEND_LOOP_SPEED',
      payload: {
        loopSpeed: loopSpeed
      }
    })
  }

  useEffect(() => {
    setLoopSpeed(props.store.settingsReducer.allSettingsReducer.loop_speed);

  }, [props.store.settingsReducer.allSettingsReducer.loop_speed]);

  useEffect(() => {
    getUsers();
    getAllSettings();
  }, []);

  return (
    <div className="Admin">
      {/* <center>
        <p>Admin Settings Page</p>
      </center> */}
      <div className="divider" />
      {(props.store.accountReducer.userReducer.admin)
        ? <div>
          <h4>Manage Users</h4>
          {props.store.usersReducer.allUsersReducer.map((user) => {
            return <SingleUser key={user.id} user={user} />
          })}
        </div>
        : <></>
      }
      <div className="divider" />
      <h4>Set Loop Speed</h4>
      {/* {JSON.stringify(props.store.settingsReducer.allSettingsReducer.loop_speed)} */}
      <p>
        This will adjust the speed of the loop. You may want to slow it down to use fewer resources and handle more users.
        Higher numbers are slower. 1 is the fastest, and the speed is a multiplier. So 4 is 4x slower than 1 for example.
      </p>
      <p>Current loop speed: {props.store.settingsReducer.allSettingsReducer.loop_speed}</p>
      <label htmlFor="loopSpeed">
        Set speed:
      </label>
      <input
        type="number"
        name="loopSpeed"
        value={loopSpeed}
        step={1}
        max={100}
        min={1}
        required
        onChange={(event) => setLoopSpeed(Number(event.target.value))}
      />
      <br />
      <button className={`btn-blue btn-reinvest medium ${props.theme}`} onClick={() => { sendLoopSpeed() }}>Save speed</button>

      <div className="divider" />
      {(props.store.accountReducer.userReducer.admin)
        ? <>
          <h4>Factory Reset</h4>
          <p>
            This will delete everything! Use with caution!
            Do not depend on being able to press this button after a git pull as a way to reset the database.
            You may not be able to log back in after the pull.
          </p>
          <p>
            CAUTION <button
              className="btn-logout btn-red"
              onClick={() => dispatch({ type: 'FACTORY_RESET' })}
            >
              Factory Reset
            </button> CAUTION
          </p>

          <p>
            This button will only reset the orders table. This will clear the orders for ALL USERS! If you mean to just clear your own, do that in the "Reset" tab
          </p>
          <p>
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
      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(Admin);