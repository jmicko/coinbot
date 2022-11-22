import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Confirm from '../../Confirm/Confirm';
import SingleUser from '../../SingleUser/SingleUser';
import './Admin.css'


function Admin(props) {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const allSettings = useSelector((store) => store.settingsReducer.allSettingsReducer);
  const allUsers = useSelector((store) => store.usersReducer.allUsersReducer);

  const [loopSpeed, setLoopSpeed] = useState(1);
  const [fullSync, setFullSync] = useState(10);
  const [syncQuantity, setSyncQuantity] = useState(100);
  const [resettingOrders, setResettingOrders] = useState(false);
  const [factoryResetting, setFactoryResetting] = useState(false);


  const getUsers = useCallback(
    () => {
      if (user.admin) {
        dispatch({ type: 'FETCH_USERS' })
      }
    }, [dispatch, user.admin]
  )

  const getAllSettings = useCallback(
    () => {
      if (user.admin) {
        dispatch({ type: 'FETCH_SETTINGS' })
      }
    }, [dispatch, user.admin]
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
    if (allSettings.loop_speed) {
      handleLoopSpeedChange(allSettings.loop_speed);
    }
  }, [allSettings.loop_speed]);

  useEffect(() => {
    if (allSettings.full_sync) {
      handleFullSyncChange(allSettings.full_sync);
    }

  }, [allSettings.full_sync]);

  useEffect(() => {
    if (allSettings.orders_to_sync) {
      handleSyncQuantityChange(allSettings.orders_to_sync);
    }

  }, [allSettings.orders_to_sync]);

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
      {/* TOGGLE MAINTENANCE */}

      <h4>Toggle Maintenance Mode</h4>
      {/* {JSON.stringify(allSettings.maintenance)} */}
      {props.tips && <p>
        This essentially pauses all user loops. Can be useful when migrating the bot to another server for example.
      </p>}
      {allSettings.maintenance
        ?
        <p>Maintenance mode is currently ON</p>
        :
        <p>Maintenance mode is currently OFF</p>
      }
      {allSettings.maintenance
        ?
        <button className={`btn-green btn-reinvest medium ${user.theme}`} onClick={() => { toggleMaintenance() }}>Turn off</button>
        :
        <button className={`btn-red btn-reinvest medium ${user.theme}`} onClick={() => { toggleMaintenance() }}>Turn on</button>
      }

      <div className="divider" />

      {/* MANAGE USERS */}
      {(user.admin)
        ? <div>
          <h4>Manage Users</h4>
          {allUsers.map((user) => {
            return <SingleUser key={user.id} user={user} />
          })}
        </div>
        : <></>
      }
      <div className="divider" />

      {/* SET LOOP SPEED */}

      <h4>Set Loop Speed</h4>
      {props.tips && <p>
        This will adjust the speed of the loop. You may want to slow it down to use fewer resources and handle more users.
        Higher numbers are slower. 1 is the fastest, and the speed is a multiplier. So 4 is 4x slower than 1 for example.
      </p>}
      <p>Current loop speed: {allSettings.loop_speed}</p>
      <div className='left-border'>
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
        <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={() => { sendLoopSpeed() }}>Save speed</button>
      </div>

      <div className="divider" />

      {/* SET FULL SYNC FREQUENCY */}

      <h4>Set Full Sync Frequency</h4>
      {props.tips && <p>
        This will adjust how often the bot does a full sync. A full sync takes longer and is more CPU intensive,
        but will check for and delete extra trades etc. A quick sync only checks for recently settled trades.
      </p>}
      <p>Current frequency: Every {allSettings.full_sync} loop{allSettings.full_sync > 1 && 's'}</p>
      <div className='left-border'>
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
        <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={() => { sendFullSync() }}>Save Frequency</button>
      </div>

      <div className="divider" />

      {/* SET ORDER SYNC QUANTITY */}

      <h4>Set Synced Order Quantity</h4>
      {/* {JSON.stringify(allSettings)} */}
      {props.tips && <p>
        This adjusts how many trades per side to keep in sync with Coinbase Pro (How many buys, how many sells). There is a max of 200, which
        keeps the total under the 500 order limit on Coinbase pro, while also allowing a margin for flipping trades. Putting a low number here
        may slightly increase the speed of the bot or lower CPU usage, but risks that all trades on one side will settle before the bot has the chance to sync more.
      </p>}
      <p>Current quantity: {allSettings.orders_to_sync}</p>
      <div className='left-border'>
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
        <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={() => { sendSyncQuantity() }}>Save Quantity</button>
      </div>
      <div className="divider" />

      {/* FACTORY RESET */}
      {(user.admin)
        ? <>
          {factoryResetting && <Confirm
            // if confirm, dispatch to factory reset bot
            execute={() => { dispatch({ type: 'FACTORY_RESET' }); setFactoryResetting(false) }}
            // if cancel, toggle boolean so message goes away
            ignore={() => setFactoryResetting(false)}
          />}
          <h4>Factory Reset</h4>
          {props.tips && <p>
            This will delete everything! Use with caution!
            Do not depend on being able to press this button after a git pull as a way to reset the database.
            You may not be able to log back in after the pull.
          </p>}
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
          {props.tips && <p>
            This button will only reset the orders table. This will clear the orders for ALL USERS! If you mean to just clear your own, do that in the "Reset" tab
          </p>}
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

export default Admin;