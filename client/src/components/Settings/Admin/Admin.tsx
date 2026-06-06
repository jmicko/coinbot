import { useEffect, useState, useMemo } from 'react';
// import Confirm from '../../Confirm/Confirm';
import SingleUser from '../../SingleUser/SingleUser';
import './Admin.css'
import useGetFetch from '../../../hooks/useGetFetch';
import { BotSettings, User } from '../../../types/index.js';
import usePutFetch from '../../../hooks/usePutFetch';
import { useUser } from '../../../hooks/useUser.js';
import Collapser from '../../Collapser/Collapser.js';

interface ServerLogEntry {
  ts?: string;
  level?: string;
  message?: string;
  userID?: string | number | null;
  context?: {
    name?: string;
    scope?: string;
  };
  suppressedCount?: number;
  raw?: string;
}

interface LogTailResponse {
  file: string;
  files?: string[];
  size: number;
  truncated: boolean;
  entries: ServerLogEntry[];
}

function getLocalDateInputValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function Admin(props: { tips: boolean }) {

  const allUsersOptions = useMemo(() => ({
    url: 'api/admin/users',
    defaultState: [],
    preload: true,
    from: 'allUsers in Admin'
  }), []);
  const { theme, refreshUser } = useUser();
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
      registration_open: true,
    },
    preload: true,
    from: 'allSettings in Admin'
  }), []);
  const {
    data: allSettings,
    setData: setAllSettings,
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
    = usePutFetch<BotSettings>({
      url: 'api/admin/maintenance',
      from: 'toggleMaintenanceMode in Admin',
      setData: setAllSettings,
      refreshCallback: refreshUser,
    });
  const { putData: toggleRegistration }
    = usePutFetch({
      url: 'api/admin/registration',
      from: 'toggleRegistration in Admin',
      refreshCallback: refreshSettings,
    });

  const [loopSpeed, setLoopSpeed] = useState(1);
  const [fullSync, setFullSync] = useState(10);
  const [syncQuantity, setSyncQuantity] = useState(100);
  const [metricsDownloading, setMetricsDownloading] = useState(false);
  const [metricsError, setMetricsError] = useState('');
  const [logsBucket, setLogsBucket] = useState('app');
  const [logsDate, setLogsDate] = useState(getLocalDateInputValue());
  const [logsUserSearch, setLogsUserSearch] = useState('');
  const [logsLines, setLogsLines] = useState(200);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [logsMeta, setLogsMeta] = useState('');
  const [logs, setLogs] = useState<ServerLogEntry[]>([]);
  const selectedLogUser = useMemo(() => {
    const search = logsUserSearch.trim().toLowerCase();
    return allUsers.find(user => user.username.toLowerCase() === search) || null;
  }, [allUsers, logsUserSearch]);
  const userLogSelectionMissing = logsBucket === 'user' && !selectedLogUser;
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

  useEffect(() => {
    const handleSettingsUpdate = () => {
      refreshSettings();
    };

    window.addEventListener('coinbot:settingsUpdate', handleSettingsUpdate);

    return () => {
      window.removeEventListener('coinbot:settingsUpdate', handleSettingsUpdate);
    };
  }, [refreshSettings]);

  async function downloadDbMetrics() {
    setMetricsDownloading(true);
    setMetricsError('');

    try {
      const response = await fetch('api/admin/dbMetrics/download?limit=100');
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || `coinbot-db-metrics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setMetricsDownloading(false);
    }
  }

  function getLogQuery(includeLines = false) {
    const params = new URLSearchParams({
      bucket: logsBucket,
      date: logsDate,
      timeZone: getBrowserTimeZone(),
    });

    if (includeLines) {
      params.set('lines', String(logsLines));
    }

    if (logsBucket === 'user' && selectedLogUser) {
      params.set('userID', String(selectedLogUser.id));
    }

    return params.toString();
  }

  function formatLogEntry(entry: ServerLogEntry) {
    if (entry.raw) return entry.raw;
    const userText = entry.userID ? ` user:${entry.userID}` : '';
    const contextText = entry.context?.name ? ` ${entry.context.name}` : '';
    const duplicateText = entry.suppressedCount ? ` (${entry.suppressedCount} suppressed)` : '';
    return `${entry.ts || ''} ${(entry.level || 'info').toUpperCase()}${userText}${contextText} ${entry.message || ''}${duplicateText}`;
  }

  async function loadRecentLogs() {
    if (userLogSelectionMissing) {
      setLogsError('Select a user before loading user logs.');
      return;
    }

    setLogsLoading(true);
    setLogsError('');
    setLogsMeta('');

    try {
      const params = new URLSearchParams({ limit: String(logsLines) });
      if (logsBucket === 'user' && selectedLogUser) {
        params.set('userID', String(selectedLogUser.id));
      }
      if (logsBucket === 'errors') params.set('level', 'error');
      const response = await fetch(`api/admin/logs/recent?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Recent logs failed with status ${response.status}`);
      }
      const data = await response.json() as ServerLogEntry[];
      setLogs(data);
      setLogsMeta(`Showing ${data.length} recent in-memory log entries`);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : 'Recent logs failed');
    } finally {
      setLogsLoading(false);
    }
  }

  async function tailLogs() {
    if (userLogSelectionMissing) {
      setLogsError('Select a user before loading user logs.');
      return;
    }

    setLogsLoading(true);
    setLogsError('');
    setLogsMeta('');

    try {
      const response = await fetch(`api/admin/logs/tail?${getLogQuery(true)}`);
      if (!response.ok) {
        throw new Error(`Tail logs failed with status ${response.status}`);
      }
      const data = await response.json() as LogTailResponse;
      setLogs(data.entries);
      setLogsMeta(`${data.file} - ${data.size} bytes${data.files ? ` - ${data.files.length} UTC hour file${data.files.length === 1 ? '' : 's'}` : ''}${data.truncated ? ' - showing file tail' : ''}`);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : 'Tail logs failed');
    } finally {
      setLogsLoading(false);
    }
  }

  async function downloadLogs() {
    if (userLogSelectionMissing) {
      setLogsError('Select a user before downloading user logs.');
      return;
    }

    setLogsLoading(true);
    setLogsError('');

    try {
      const response = await fetch(`api/admin/logs/download?${getLogQuery()}`);
      if (!response.ok) {
        throw new Error(`Download logs failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || `coinbot-${logsBucket}-logs-${logsDate}-${getBrowserTimeZone().replace(/[^a-z0-9_-]+/gi, '_')}.jsonl`;
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : 'Download logs failed');
    } finally {
      setLogsLoading(false);
    }
  }

  return (
    <div className="Admin settings-panel scrollable">
      <div className={`divider ${theme}`} />

      {/* TOGGLE MAINTENANCE */}
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

      {/* TOGGLE REGISTRATION */}
      <Collapser title='Toggle Registration' >
        <div className='left-border'>
          {props.tips && <p>
            This will toggle the registration form on the login page. If registration is off, no new users can sign up.
            If the admin account is deleted, registration will be forced on and the next user to sign up will become the new admin.
          </p>}
          {allSettings.registration_open
            ?
            <p>New user registration is currently ENABLED</p>
            :
            <p>New user registration is currently DISABLED</p>
          }
          {allSettings.registration_open
            ?
            <button
              className={`btn-red btn-registration medium ${theme}`}
              onClick={() => { toggleRegistration() }}
            >
              Disable
            </button>
            :
            <button
              className={`btn-green btn-registration medium ${theme}`}
              onClick={() => { toggleRegistration() }}
            >
              Enable
            </button>
          }
        </div>
      </Collapser>

      <div className={`divider ${theme}`} />

      {/* DATABASE METRICS */}
      <Collapser title='Database Metrics' >
        <div className='left-border'>
          {props.tips && <p>
            These metrics live in server memory and reset when the server process restarts. Download them before restarting production.
          </p>}
          <button
            className={`btn-blue btn-reinvest medium ${theme}`}
            disabled={metricsDownloading}
            onClick={downloadDbMetrics}
          >
            {metricsDownloading ? 'Downloading...' : 'Download metrics'}
          </button>
          {metricsError && <p>{metricsError}</p>}
        </div>
      </Collapser>

      <div className={`divider ${theme}`} />

      {/* SERVER LOGS */}
      <Collapser title='Server Logs' >
        <div className='left-border'>
          {props.tips && <p>
            Recent logs come from server memory. Tail reads from the end of the selected JSONL file without loading the whole file.
          </p>}
          <div className='admin-log-controls'>
            <label htmlFor='admin-log-bucket'>File:</label>
            <select
              id='admin-log-bucket'
              value={logsBucket}
              onChange={(event) => setLogsBucket(event.target.value)}
            >
              <option value='app'>App</option>
              <option value='errors'>Errors</option>
              <option value='user'>User</option>
            </select>
            <label htmlFor='admin-log-date'>Date:</label>
            <input
              id='admin-log-date'
              type='date'
              value={logsDate}
              onChange={(event) => setLogsDate(event.target.value)}
            />
            {logsBucket === 'user' && <>
              <label htmlFor='admin-log-user'>User:</label>
              <input
                id='admin-log-user'
                type='search'
                list='admin-log-users'
                value={logsUserSearch}
                placeholder='Search username'
                autoComplete='off'
                onChange={(event) => setLogsUserSearch(event.target.value)}
              />
              <datalist id='admin-log-users'>
                {allUsers.map(user => (
                  <option key={user.id} value={user.username} />
                ))}
              </datalist>
              {selectedLogUser && <span>#{selectedLogUser.id}</span>}
            </>}
            <label htmlFor='admin-log-lines'>Lines:</label>
            <input
              id='admin-log-lines'
              type='number'
              min={10}
              max={1000}
              value={logsLines}
              onChange={(event) => setLogsLines(Number(event.target.value))}
            />
          </div>
          <div className='admin-log-actions'>
            <button
              className={`btn-blue btn-reinvest medium ${theme}`}
              disabled={logsLoading || userLogSelectionMissing}
              onClick={loadRecentLogs}
            >
              Recent
            </button>
            <button
              className={`btn-blue btn-reinvest medium ${theme}`}
              disabled={logsLoading || userLogSelectionMissing}
              onClick={tailLogs}
            >
              Tail day
            </button>
            <button
              className={`btn-blue btn-reinvest medium ${theme}`}
              disabled={logsLoading || userLogSelectionMissing}
              onClick={downloadLogs}
            >
              Download day
            </button>
          </div>
          {logsMeta && <p>{logsMeta}</p>}
          {logsError && <p>{logsError}</p>}
          <pre className={`admin-log-viewer ${theme}`}>
            {logs.map(formatLogEntry).join('\n')}
          </pre>
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
