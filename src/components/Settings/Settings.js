import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Settings.css'



function Settings(props) {
  const dispatch = useDispatch();

  const [key, setKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [secret, setSecret] = useState('');


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
        secret: secret
      }
    });

    // clear the form
    // setKey('');
    // setPassphrase('');
    // setSecret('');
  }

  if (props.showSettings) {

    return (
      <div className="Settings">
        <button className="btn-logout btn-red" onClick={() => { props.clickSettings() }}>X</button>
        <h2 className="settings-header">Settings</h2>
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
            type="text"
            name="passphrase"
            value={passphrase}
            required
            onChange={(event) => setPassphrase(event.target.value)}
          />
          <label htmlFor="secret">
            API Secret:
          </label>
          <input
            type="text"
            name="secret"
            value={secret}
            required
            onChange={(event) => setSecret(event.target.value)}
          />
          {/* submit button */}
          <input className="btn-store-api btn-blue" type="submit" name="submit" value="Store API details" />
        </form>
      </div>
    );
  } else {
    return (
      <></>
    );
  }
}

export default connect(mapStoreToProps)(Settings);
