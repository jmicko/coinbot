import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import permissions from "../../../src/permissions.png";
import './NotActive.css';


function NotActive() {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const errors = useSelector((store) => store.errorsReducer.apiMessage);

  const [key, setKey] = useState('');
  const [secret, setSecret] = useState('');
  // const [URI, setURI] = useState('real');
  const [saving, setSaving] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  function submitApi(event) {
    event.preventDefault();
    dispatch({ type: 'CLEAR_API_ERROR' })
    setSaving(true)
    dispatch({
      type: 'STORE_API',
      payload: {
        key: key,
        secret: secret,
        // URI: URI
        URI: 'real'
      }
    });
    // clear the form
    setKey('');
    setSecret('');
  }

  useEffect(() => {
    if (errors) {
      setSaving(false)
    }
  }, [errors])


  return (
      <div className="NotActive scrollable boxed">
        {/* <div className="API"> */}

          <h3 className={`title not-active ${user.theme}`}>You are not active!</h3>
          <p>
            You must store your API details from Coinbase Advanced Trading before you can trade. </p><p>
            - You can create an API key <a href='https://www.coinbase.com/settings/api' target="_blank">here</a> <br />
            - Click <strong>New API Key</strong>, and follow the prompts. <br />
            - For accounts, select "all"<br />
            -For permissions, select as shown <br />
            <button className={`btn-blue btn-sandbox-api medium ${user.theme}`} onClick={(event) => { event.preventDefault(); setShowPermissions(!showPermissions) }}>here</button>or select "all"<br />
            - You will be given a Key and Secret. Enter them below.
          </p>
          {showPermissions && <img className="required-permissions-image" src={permissions} alt="required-permissions-image" />}

          <div className="divider short" />

          {/* form for entering api details */}
          <form className="api-form" onSubmit={submitApi} >
            <h4>API</h4>
            <p>Paste your API key and secret from <a href='https://www.coinbase.com/settings/api' target="_blank">Coinbase</a> here</p>
            <label htmlFor="key">
              API Key:
            </label><br />
            <input
              type="text"
              name="key"
              value={key}
              required
              onChange={(event) => setKey(event.target.value)}
            /><br />
            <label htmlFor="secret">
              API Secret:
            </label><br />
            <input
              type="password"
              name="secret"
              value={secret}
              required
              onChange={(event) => setSecret(event.target.value)}
            /><br />
            {/* <label htmlFor="URI">
              Real money or sandbox?
            </label><br />
            {(URI === "real")
              ? <button className={`btn-green btn-sandbox-api medium ${user.theme}`} onClick={(event) => { event.preventDefault(); setURI("sandbox") }}>Real Money API</button>
              : <button className={`btn-green btn-sandbox-api medium ${user.theme}`} onClick={(event) => { event.preventDefault(); setURI("real") }}>Sandbox API</button>
            }
            (click to change) */}
            {/* <br /> */}
            <br />
            {errors &&
              <div className='api error-box notched'>
                <p>{errors}</p>
              </div>
            }
            {saving
              ? <p>Saving...</p>
              : <input className={`btn-store-api btn-blue medium ${user.theme}`} type="submit" name="submit" value="Store API details" />
            }
          </form>


        {/* </div> */}

        {/* </div> */}
      </div>
    // </div>
  );
}


export default NotActive;
