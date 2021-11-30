import React, { useState, useEffect, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Settings.css'



function Settings(props) {
  const dispatch = useDispatch();

  const [key, setKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [secret, setSecret] = useState('');
  const [URI, setURI] = useState('sandbox');

  const getUsers = useCallback(
    () => {
      console.log('getting users');
      dispatch({type: 'FETCH_USERS'})
    }, [dispatch]
  )

  useEffect(() => {
    getUsers();
  }, []);


  // delete the order if the abandon button is clicked.
  // the loop already detects deleted orders, so only need to make a call to coinbase
  // no need to bother the database if it is busy
  function deleteAllOrders() {
    console.log('clicked delete', props.store.ordersReducer.openOrdersInOrder);
    // call the orders delete route
    dispatch({ type: 'DELETE_ALL_ORDERS' });
  }

  function submitApi(event) {
    event.preventDefault();
    console.log('api details submitted!');
    dispatch({
      type: 'STORE_API',
      payload: {
        key: key,
        passphrase: passphrase,
        secret: secret,
        URI: URI
      }
    });

    // clear the form
    setKey('');
    setPassphrase('');
    setSecret('');
  }

  if (props.showSettings) {

    return (
      <div className="Settings">
        <button className="btn-logout btn-red" onClick={() => { props.clickSettings() }}>X</button>
        <h2 className="settings-header">Settings</h2>
        <p>hello {props.store.accountReducer.userReducer.username}!</p>

        {(props.store.accountReducer.userReducer.admin)
          ? <div>
            <h4>Approve New Users</h4>
            {JSON.stringify(props.store.usersReducer.allUsersReducer)}
          </div>
          : <></>
        }

        <h4>Delete All Trades</h4>
        <p>Danger! This button will delete all your positions! Press it carefully!</p>
        <button className="btn-blue" onClick={() => { deleteAllOrders() }}>Delete All</button>
        <h4>Synchronize All Trades</h4>
        <p>
          This will delete all open orders from coinbase and replace them based on the trades stored in the
          database. It can sometimes fix issues that cause repeated errors, and may take a few minutes to complete
        </p>
        <button className="btn-logout btn-blue" onClick={() => dispatch({ type: 'SYNC_ORDERS' })}>Sync All Trades</button>
        <h4>API</h4>
        <p>Paste your API key, passphrase, and secret from Coinbase here</p>
        {/* form for entering api details */}
        <form className="api-form" onSubmit={submitApi} >
          <label htmlFor="key">
            API Key:
          </label>
          <input
            type="text"
            name="key"
            value={key}
            required
            onChange={(event) => setKey(event.target.value)}
          />
          <label htmlFor="passphrase">
            API Passphrase:
          </label>
          <input
            type="password"
            name="passphrase"
            value={passphrase}
            required
            onChange={(event) => setPassphrase(event.target.value)}
          />
          <label htmlFor="secret">
            API Secret:
          </label>
          <input
            type="password"
            name="secret"
            value={secret}
            required
            onChange={(event) => setSecret(event.target.value)}
          />
          <label htmlFor="URI">
            Real money or sandbox?
          </label>
          {(URI === "real")
            ? <button className="btn-green" onClick={(event) => { event.preventDefault(); setURI("sandbox") }}>Real Money API</button>
            : <button className="btn-green" onClick={(event) => { event.preventDefault(); setURI("real") }}>Sandbox API</button>
          }
          <br />
          <br />
          {/* submit button */}
          <input className="btn-store-api btn-blue" type="submit" name="submit" value="Store API details" />
        </form>
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
            </p>
          </>
          : <></>
        }
      </div>
    );
  } else {
    return (
      <></>
    );
  }
}

export default connect(mapStoreToProps)(Settings);
