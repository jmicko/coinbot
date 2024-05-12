import { useState, useMemo } from 'react';
// import Confirm from '../../Confirm/Confirm';
import SingleUser from '../../SingleUser/SingleUser';
import './Admin.css'
import useGetFetch from '../../../hooks/useGetFetch';
import { BotSettings, User } from '../../../types/index.js';
import usePutFetch from '../../../hooks/usePutFetch';
import { useUser } from '../../../hooks/useUser.js';
import Collapser from '../../Collapser/Collapser.js';


function Admin(props: { tips: boolean }) {

  const allUsersOptions = useMemo(() => ({
    url: 'api/admin/users',
    defaultState: [],
    preload: true,
    from: 'allUsers in Admin'
  }), []);
  const { theme } = useUser();
  const {
    data: allUsers,
    refresh: refreshUsers
  } = useGetFetch<User[]>(allUsersOptions);

  // const { putData: approveChat }
  //   = usePutFetch('api/admin/users/chat', { defaultState: [], preload: false, from: 'approveChat in Admin' });

  const allSettingsOptions = useMemo(() => ({
    url: 'api/settings',
    defaultState: {
      loop_speed: 1,
      orders_to_sync: 1,
      full_sync: 1,
      maintenance: false,
    },
    preload: true,
    from: 'allSettings in Admin'
  }), []);
  const {
    data: allSettings,
    refresh: refreshSettings
  } = useGetFetch<BotSettings>(allSettingsOptions);
  const { putData: updateLoopSpeed }
    = usePutFetch({
      url: 'api/admin/loop_speed',
      from: 'updateLoopSpeed in Admin',
      refreshCallback: refreshSettings,
    });
  const { putData: updateFullSync }
    = usePutFetch({
      url: 'api/admin/full_sync',
      from: 'updateFullSync in Admin',
      refreshCallback: refreshSettings,
    });
  const { putData: updateSyncQuantity }
    = usePutFetch({
      url: 'api/admin/order_sync_quantity',
      from: 'updateSyncQuantity in Admin',
      refreshCallback: refreshSettings,
    });
  const { putData: toggleMaintenanceMode }
    = usePutFetch({
      url: 'api/admin/maintenance',
      from: 'toggleMaintenanceMode in Admin',
      refreshCallback: refreshSettings,
    });

  const [loopSpeed, setLoopSpeed] = useState(1);
  const [fullSync, setFullSync] = useState(10);
  const [syncQuantity, setSyncQuantity] = useState(100);
  // const [resettingOrders, setResettingOrders] = useState(false);
  // const [factoryResetting, setFactoryResetting] = useState(false);


  // async function sendLoopSpeed() {
  //   // setLoopSpeed(speed);
  //   await updateLoopSpeed({ loopSpeed: loopSpeed });
  //   // refreshSettings();
  // }

  // async function sendFullSync() {
  //   await updateFullSync({ fullSync: fullSync });
  //   // refreshSettings();
  // }

  // async function sendSyncQuantity() {
  //   await updateSyncQuantity({ syncQuantity: syncQuantity });
  //   // refreshSettings();
  // }

  // async function toggleMaintenance() {
  //   await toggleMaintenanceMode();
  //   // refreshSettings();
  // }



  // useEffect(() => {
  //   // if (allSettings.loop_speed) {
  //   //   setLoopSpeed(allSettings.loop_speed);
  //   // }
  //   if (allSettings.full_sync) {
  //     setFullSync(allSettings.full_sync);
  //   }
  //   if (allSettings.orders_to_sync) {
  //     setSyncQuantity(allSettings.orders_to_sync);
  //   }
  // }, [allSettings]);

  return (
    <div className="Admin settings-panel scrollable">
      {/* <center>
        <p>Admin Settings Page</p>
      </center> */}
      <div className={`divider ${theme}`} />
      {/* TOGGLE MAINTENANCE */}

      {/* <h4>Toggle Maintenance Mode</h4> */}
      <Collapser title='Toggle Maintenance Mode' >
        <div className='left-border'>
          {/* {JSON.stringify(allSettings)} */}
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
            <button
              className={`btn-green btn-reinvest medium ${theme}`}
              onClick={() => { toggleMaintenanceMode() }}
            >
              Turn off
            </button>
            :
            <button
              className={`btn-red btn-reinvest medium ${theme}`}
              onClick={() => { toggleMaintenanceMode() }}
            >
              Turn on
            </button>
          }
        </div>
      </Collapser>

      <div className={`divider ${theme}`} />

      {/* MANAGE USERS */}
      <div>
        <Collapser
          title='Manage Users'
        >
          {allUsers.map((regUser: User) => {
            return <SingleUser
              key={regUser.id}
              user={regUser}
              refreshUsers={refreshUsers}
            />
          })}
        </Collapser>
      </div>


      <div className={`divider ${theme}`} />

      {/* SET LOOP SPEED */}
      {/* <h4>Set Loop Speed</h4> */}
      <Collapser
        title='Set Loop Speed'
      >
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
            id='loopSpeed'
            value={loopSpeed}
            step={1}
            max={100}
            min={1}
            required
            onChange={(event) => setLoopSpeed(Number(event.target.value))}
          />
          <br />
          <br />
          <button
            className={`btn-blue btn-reinvest medium ${theme}`}
            onClick={() => { updateLoopSpeed({ loopSpeed: loopSpeed }) }}
          >
            Save speed
          </button>
        </div>
      </Collapser>

      <div className={`divider ${theme}`} />

      {/* SET FULL SYNC FREQUENCY */}

      {/* <h4>Set Full Sync Frequency</h4> */}
      <Collapser
        title='Set Full Sync Frequency'
      >
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
            id='fullSync'
            value={fullSync}
            step={1}
            max={100}
            min={1}
            required
            onChange={(event) => setFullSync(Number(event.target.value))}
          />
          <br />
          <br />
          <button
            className={`btn-blue btn-reinvest medium ${theme}`}
            onClick={() => { updateFullSync({ fullSync: fullSync }) }}
          >
            Save Frequency
          </button>
        </div>
      </Collapser>

      <div className={`divider ${theme}`} />

      {/* SET ORDER SYNC QUANTITY */}

      {/* <h4>Set Max Synced Order Quantity</h4> */}
      <Collapser
        title='Set Max Synced Order Quantity'
      >
        {props.tips && <p>
          Users are able to adjust how many trades per side to keep in sync with Coinbase (How many buys, how many sells).
          Changing this number puts a limit on how high users are able to set their own sync quantities. There is a max of 200, which
          keeps the total under the 500 order limit on Coinbase, while also allowing a margin for flipping trades. Putting a low number here
          may slightly increase the speed of the bot or lower CPU usage, but risks that all trades on one side will settle before the bot has the chance to sync more.
        </p>}
        <p>Current quantity: {allSettings.orders_to_sync}</p>
        <div className='left-border'>
          <label htmlFor="syncQuantity">
            Set Sync Quantity:
          </label>
          <input
            type="number"
            name="syncQuantity"
            id='syncQuantity'
            value={syncQuantity}
            step={1}
            max={200}
            min={1}
            required
            onChange={(event) => setSyncQuantity(Number(event.target.value))}
          />
          <br />
          <br />
          <button
            className={`btn-blue btn-reinvest medium ${theme}`}
            onClick={() => { updateSyncQuantity({ syncQuantity: syncQuantity }) }}
          >Save Quantity</button>
        </div>
      </Collapser>
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