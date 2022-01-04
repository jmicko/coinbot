import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './NotActive.css';


function NotActive(props) {
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
    <div className="NotActive" >
      <div className="scrollable boxed">
        <h3 className={`title ${props.theme}`}>You are not active!</h3>
        <p>
          You must store your API details from Coinbase Pro before you can trade. <br/>
          - You can create an API key by clicking your name on Coinbase Pro, and clicking <strong>API</strong>. <br/>
          - Then click <strong>+ New API Key</strong>, and go through the process. <br/>
          - Enter the details below.
          </p>



        <div className="API">
          <div className="divider" />
          <h4>API</h4>
          <p>Paste your API key, passphrase, and secret from Coinbase here</p>
          {/* form for entering api details */}
          <form className="api-form" onSubmit={submitApi} >
            <label htmlFor="key">
              API Key:
            </label><br/>
            <input
              type="text"
              name="key"
              value={key}
              required
              onChange={(event) => setKey(event.target.value)}
            /><br/>
            <label htmlFor="passphrase">
              API Passphrase:
            </label><br/>
            <input
              type="password"
              name="passphrase"
              value={passphrase}
              required
              onChange={(event) => setPassphrase(event.target.value)}
            /><br/>
            <label htmlFor="secret">
              API Secret:
            </label><br/>
            <input
              type="password"
              name="secret"
              value={secret}
              required
              onChange={(event) => setSecret(event.target.value)}
            /><br/>
            <label htmlFor="URI">
              Real money or sandbox?
            </label><br/>
            {(URI === "real")
              ? <button className={`btn-green btn-sandbox-api medium ${props.theme}`} onClick={(event) => { event.preventDefault(); setURI("sandbox") }}>Real Money API</button>
              : <button className={`btn-green btn-sandbox-api medium ${props.theme}`} onClick={(event) => { event.preventDefault(); setURI("real") }}>Sandbox API</button>
            }
            (click to change)
            <br />
            <br />
            <input className={`btn-store-api btn-blue medium ${props.theme}`} type="submit" name="submit" value="Store API details" />
          </form>
        </div>
      </div>
      {/* <div className="spacer" > jgdsf</div> */}
    </div>
  );
}


export default connect(mapStoreToProps)(NotActive);
