import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../../contexts/UserContext.js';
import { useFetchData } from '../../../hooks/fetchData.js';
// import Confirm from '../../Confirm/Confirm';
import SingleUser from '../../SingleUser/SingleUser.js';
import './Admin.css'


function Admin(props) {
  const { user, theme } = useUser();
  const { data: allUsers, updateRefreshData: approveUser, deleteRefreshData: deleteUser, refresh:refreshUsers } = useFetchData('api/admin/users', { defaultState: [] });
  const {  updateData: approveChat } = useFetchData('api/admin/users/chat', { defaultState: [], noLoad: true });

  const { data: allSettings, refresh: refreshSettings } = useFetchData('api/settings', { defaultState: [] });
  const { updateData: updateLoopSpeed } = useFetchData('api/admin/loop_speed', { defaultState: [], noLoad: true });
  const { updateData: updateFullSync } = useFetchData('api/admin/full_sync', { defaultState: [], noLoad: true });
  const { updateData: updateSyncQuantity } = useFetchData('api/admin/order_sync_quantity', { defaultState: [], noLoad: true });
  const { updateData: toggleMaintenanceMode } = useFetchData('api/admin/maintenance', { defaultState: [], noLoad: true });

  const [loopSpeed, setLoopSpeed] = useState(1);
  const [fullSync, setFullSync] = useState(10);
  const [syncQuantity, setSyncQuantity] = useState(100);
  // const [resettingOrders, setResettingOrders] = useState(false);
  // const [factoryResetting, setFactoryResetting] = useState(false);

  const approveUserChat = useCallback(
    async (chatPermission) => {
      await approveChat(chatPermission);
      refreshUsers();
    },
    [approveChat, refreshUsers],
  )


  async function sendLoopSpeed(speed) {
    setLoopSpeed(speed);
    await updateLoopSpeed({ loopSpeed: speed });
    refreshSettings();
  }

  async function sendFullSync() {
    await updateFullSync({ fullSync: fullSync });
    refreshSettings();
  }

  async function sendSyncQuantity() {
    await updateSyncQuantity({ syncQuantity: syncQuantity });
    refreshSettings();
  }

  async function toggleMaintenance() {
    await toggleMaintenanceMode();
    refreshSettings();
  }

  useEffect(() => {
    // if (allSettings.loop_speed) {
    //   setLoopSpeed(allSettings.loop_speed);
    // }
    if (allSettings.full_sync) {
      setFullSync(allSettings.full_sync);
    }
    if (allSettings.orders_to_sync) {
      setSyncQuantity(allSettings.orders_to_sync);
    }
  }, [allSettings]);

  return (
    <div className="Admin settings-panel scrollable">
      {/* <center>
        <p>Admin Settings Page</p>
      </center> */}
      <div className={`divider ${theme}`} />
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
        <button className={`btn-green btn-reinvest medium ${theme}`} onClick={() => { toggleMaintenance() }}>Turn off</button>
        :
        <button className={`btn-red btn-reinvest medium ${theme}`} onClick={() => { toggleMaintenance() }}>Turn on</button>
      }

      <div className={`divider ${theme}`} />

      {/* MANAGE USERS */}
      {(user.admin)
        ? <div>
          <h4>Manage Users</h4>
          {allUsers.map((user) => {
            return <SingleUser key={user.id} user={user} deleteUser={deleteUser} approveUser={approveUser} approveUserChat={approveUserChat} />
          })}
        </div>
        : <></>
      }
      <div className={`divider ${theme}`} />

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
          onChange={(event) => sendLoopSpeed(Number(event.target.value))}
        />
        <br />
        <br />
        <button className={`btn-blue btn-reinvest medium ${theme}`} onClick={() => { sendLoopSpeed() }}>Save speed</button>
      </div>

      <div className={`divider ${theme}`} />

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
          onChange={(event) => setFullSync(Number(event.target.value))}
        />
        <br />
        <br />
        <button className={`btn-blue btn-reinvest medium ${theme}`} onClick={() => { sendFullSync() }}>Save Frequency</button>
      </div>

      <div className={`divider ${theme}`} />

      {/* SET ORDER SYNC QUANTITY */}

      <h4>Set Max Synced Order Quantity</h4>
      {/* {JSON.stringify(allSettings)} */}
      {props.tips && <p>
        Users are able to adjust how many trades per side to keep in sync with Coinbase (How many buys, how many sells). 
        Changing this number puts a limit on how high users are able to set their own sync quantities. There is a max of 200, which
        keeps the total under the 500 order limit on Coinbase, while also allowing a margin for flipping trades. Putting a low number here
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
          onChange={(event) => setSyncQuantity(event.target.value)}
        />
        <br />
        <br />
        <button className={`btn-blue btn-reinvest medium ${theme}`} onClick={() => { sendSyncQuantity() }}>Save Quantity</button>
      </div>
      <div className={`divider ${theme}`} />

      {/* FACTORY RESET */}
      {/* {(user.admin)
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
      <div className={`divider ${theme}`} />
       */}
    </div>
  );
}

export default Admin;