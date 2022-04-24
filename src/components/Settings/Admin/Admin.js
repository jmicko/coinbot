import React, { useState, useEffect, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import Confirm from '../../Confirm/Confirm';
import SingleUser from '../../SingleUser/SingleUser';
import './Admin.css'


function Admin(props) {
  const dispatch = useDispatch();
  const [loopSpeed, setLoopSpeed] = useState(1);
  const [fullSync, setFullSync] = useState(10);
  const [syncQuantity, setSyncQuantity] = useState(100);
  const [resettingOrders, setResettingOrders] = useState(false);
  const [factoryResetting, setFactoryResetting] = useState(false);


  const getUsers = useCallback(
    () => {
      if (props.store.accountReducer.userReducer.admin) {
        dispatch({ type: 'FETCH_USERS' })
      }
    }, [dispatch, props.store.accountReducer.userReducer.admin]
  )

  const getAllSettings = useCallback(
    () => {
      if (props.store.accountReducer.userReducer.admin) {
        dispatch({ type: 'FETCH_SETTINGS' })
      }
    }, [dispatch, props.store.accountReducer.userReducer.admin]
  )

  function sendLoopSpeed() {
    dispatch({
      type: 'SEND_LOOP_SPEED',
      payload: {
        loopSpeed: loopSpeed
      }
    })
  }

  function sendFullSync() {
    dispatch({
      type: 'SEND_FULL_SYNC',
      payload: {
        fullSync: fullSync
      }
    })
  }

  function sendSyncQuantity() {
    dispatch({
      type: 'SEND_SYNC_QUANTITY',
      payload: {
        syncQuantity: syncQuantity
      }
    })
  }

  function toggleMaintenance() {
    dispatch({
      type: 'TOGGLE_MAINTENANCE',
      // payload: {
      //   loopSpeed: loopSpeed
      // }
    })
  }

  function handleLoopSpeedChange(speed) {
    setLoopSpeed(speed);
  }

  function handleFullSyncChange(speed) {
    setFullSync(speed);
  }

  function handleSyncQuantityChange(quantity) {
    setSyncQuantity(quantity);
  }

  useEffect(() => {
    if (props.store.settingsReducer.allSettingsReducer.loop_speed) {
      handleLoopSpeedChange(props.store.settingsReducer.allSettingsReducer.loop_speed);
    }
  }, [props.store.settingsReducer.allSettingsReducer.loop_speed]);

  useEffect(() => {
    if (props.store.settingsReducer.allSettingsReducer.full_sync) {
      handleFullSyncChange(props.store.settingsReducer.allSettingsReducer.full_sync);
    }

  }, [props.store.settingsReducer.allSettingsReducer.full_sync]);

  useEffect(() => {
    if (props.store.settingsReducer.allSettingsReducer.orders_to_sync) {
      handleSyncQuantityChange(props.store.settingsReducer.allSettingsReducer.orders_to_sync);
    }

  }, [props.store.settingsReducer.allSettingsReducer.orders_to_sync]);

  useEffect(() => {
    getUsers();
    getAllSettings();
  }, [getUsers, getAllSettings]);

  return (
    <div className="Admin settings-panel scrollable">
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

      {/* SET LOOP SPEED */}

      <h4>Set Loop Speed</h4>
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
        onChange={(event) => handleLoopSpeedChange(Number(event.target.value))}
      />
      <br />
      <br />
      <button className={`btn-blue btn-reinvest medium ${props.theme}`} onClick={() => { sendLoopSpeed() }}>Save speed</button>

      <div className="divider" />

      {/* SET FULL SYNC FREQUENCY */}

      <h4>Set Full Sync Frequency</h4>
      <p>
        This will adjust how often the bot does a full sync. A full sync takes longer and is more CPU intensive,
        but will check for and delete extra trades etc. A quick sync only checks for recently settled trades.
      </p>
      <p>Current frequency: Every {props.store.settingsReducer.allSettingsReducer.full_sync} loop{props.store.settingsReducer.allSettingsReducer.full_sync > 1 && 's'}</p>
      <label htmlFor="fullSync">
        Set frequency:
      </label>
      <input
        type="number"
        name="fullSync"
        value={fullSync}
        step={1}
        max={100}
        min={1}
        required
        onChange={(event) => handleFullSyncChange(Number(event.target.value))}
      />
      <br />
      <br />
      <button className={`btn-blue btn-reinvest medium ${props.theme}`} onClick={() => { sendFullSync() }}>Save Frequency</button>

      <div className="divider" />

      {/* SET ORDER SYNC QUANTITY */}

      <h4>Set Synced Order Quantity</h4>
      {/* {JSON.stringify(props.store.settingsReducer.allSettingsReducer)} */}
      <p>
        This adjusts how many trades per side to keep in sync with Coinbase Pro (How many buys, how many sells). There is a max of 200, which 
        keeps the total under the 500 order limit on Coinbase pro, while also allowing a margin for flipping trades. Putting a low number here
        may slightly increase the speed of the bot or lower CPU usage, but risks that all trades on one side will settle before the bot has the chance to sync more.
      </p>
      <p>Current quantity: {props.store.settingsReducer.allSettingsReducer.orders_to_sync}</p>
      <label htmlFor="fullSync">
        Set Sync Quantity:
      </label>
      <input
        type="number"
        name="syncQuantity"
        value={syncQuantity}
        step={1}
        max={200}
        min={1}
        required
        onChange={(event) => handleSyncQuantityChange(Number(event.target.value))}
      />
      <br />
      <br />
      <button className={`btn-blue btn-reinvest medium ${props.theme}`} onClick={() => { sendSyncQuantity() }}>Save Quantity</button>

      <div className="divider" />

      {/* TOGGLE MAINTENANCE */}

      <h4>Toggle Maintenance Mode</h4>
      {/* {JSON.stringify(props.store.settingsReducer.allSettingsReducer.maintenance)} */}
      <p>
        This essentially pauses all user loops. Can be useful when migrating the bot to another server for example.
      </p>
      {props.store.settingsReducer.allSettingsReducer.maintenance
        ?
        <p>Maintenance mode is currently ON</p>
        :
        <p>Maintenance mode is currently OFF</p>
      }
      {props.store.settingsReducer.allSettingsReducer.maintenance
        ?
        <button className={`btn-green btn-reinvest medium ${props.theme}`} onClick={() => { toggleMaintenance() }}>Turn off</button>
        :
        <button className={`btn-red btn-reinvest medium ${props.theme}`} onClick={() => { toggleMaintenance() }}>Turn on</button>
      }

      <div className="divider" />
      {(props.store.accountReducer.userReducer.admin)
        ? <>
            {factoryResetting && <Confirm
              // if confirm, dispatch to factory reset bot
              execute={() => { dispatch({ type: 'FACTORY_RESET' }); setFactoryResetting(false) }}
              // if cancel, toggle boolean so message goes away
              ignore={() => setFactoryResetting(false)}
            />}
          <h4>Factory Reset</h4>
          <p>
            This will delete everything! Use with caution!
            Do not depend on being able to press this button after a git pull as a way to reset the database.
            You may not be able to log back in after the pull.
          </p>
          <p>
            CAUTION <button
              className="btn-logout btn-red"
              onClick={() => setFactoryResetting(true)}
              >
              Factory Reset
            </button> CAUTION
          </p>

              {resettingOrders && <Confirm
                // if confirm, dispatch to reset orders table
                execute={() => { dispatch({ type: 'ORDERS_RESET' }); setResettingOrders(false) }}
                // if cancel, toggle boolean so message goes away
                ignore={() => setResettingOrders(false)}
              />}
          <p>
            This button will only reset the orders table. This will clear the orders for ALL USERS! If you mean to just clear your own, do that in the "Reset" tab
          </p>
          <p>
            CAUTION <button
              className="btn-logout btn-red"
              onClick={() => setResettingOrders(true)}
            > Reset Orders Table
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