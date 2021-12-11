import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './API.css'


function API(props) {
  const dispatch = useDispatch();

  const [key, setKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [secret, setSecret] = useState('');
  const [URI, setURI] = useState('sandbox');

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

  return (
    <div className="API">
      {/* <center>
        <p>API Settings Page</p>
      </center> */}
      <div className="divider" />
      <h4>API</h4>
      <p>Paste your API key, passphrase, and secret from Coinbase here</p>
      {/* form for entering api details */}
      <form className="api-form" onSubmit={submitApi} >
        <label htmlFor="key">
          API Key:
        </label>
        <input
          // className={props.theme}
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
          ? <button className={`btn-green ${props.theme}`} onClick={(event) => { event.preventDefault(); setURI("sandbox") }}>Real Money API</button>
          : <button className={`btn-green ${props.theme}`} onClick={(event) => { event.preventDefault(); setURI("real") }}>Sandbox API</button>
        }
        <br />
        <br />
        <input className="btn-store-api btn-blue" type="submit" name="submit" value="Store API details" />
      </form>
      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(API);