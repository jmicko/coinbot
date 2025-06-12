import { ChangeEvent, useMemo, useState } from 'react';
// import permissions from "../../../src/permissions.png";
import './NotActive.css';
import { no } from '../../shared.js';
import { useUser } from '../../hooks/useUser.js';
import usePostFetch from '../../hooks/usePostFetch.js';
import { EventType } from '../../types/index.js';
import usePutFetch from '../../hooks/usePutFetch.js';


function NotActive() {

  const { user, refreshUser, theme } = useUser();
  // const { createData: saveApi, error: apiError, isLoading: saving } = useFetchData(`/api/account/storeApi`, { noLoad: true })
  const [apiKeyFile, setApiKeyFile] = useState<{ name: string, privateKey: string } | null>(null);

  const { error: apiError }
    = usePostFetch({
      url: `/api/account/storeApi`,
      from: 'saveApi in NotActive',
      refreshCallback: refreshUser,
    });


  const updateApiKeyOptions = useMemo(() => ({
    url: '/api/account/updateAPIKey',
    from: 'updateApiKey in General.tsx',
    refreshCallback: refreshUser
  }), [refreshUser]);
  const { putData: updateApiKey } = usePutFetch(updateApiKeyOptions);

  // const [key, setKey] = useState('');
  // const [secret, setSecret] = useState('');

  function submitApi(e: EventType) {
    no(e);
    // setSaving(true)
    // saveApi({
    //   key: key,
    //   secret: secret,
    //   URI: 'real'
    // });
    // clear the form
    // setKey('');
    // setSecret('');
  }

  const handleApiKeyFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          console.log('Parsed API key file:', json);
          setApiKeyFile(json);
          // TODO: Add API call to update keys
        } catch (error) {
          console.error('Error parsing API key file:', error);
          // TODO: Add error handling UI
        }
      };
      reader.readAsText(file);
      // setApiKeyFile(file);
    }
  };

  return (
    <div className="NotActive scrollable boxed">
      {/* <div className="API"> */}
      <h3 className={`title not-active ${user.theme}`}>You are not active!</h3>
      <p>
        You must store your API details from Coinbase Advanced Trading before you can trade. </p><p>
        - You can create an API key <a href="https://www.coinbase.com/settings/api" target="_blank" rel="noopener noreferrer">here</a> <br />
        - Click <strong>New API Key</strong>, and follow the prompts. <br />
        - Coinbase will give you a file to download that contains your API key and secret. <br />
        - You can upload that file here to update your API key. <br />
        - DO NOT modify the file in any way, and DO NOT share it with anyone.
      </p>

      {/* form for entering api details */}
      <form className="api-form" onSubmit={submitApi} >

        <div className="divider short" />
        {/* {JSON.stringify(apiError)} error */}
        <input
          type="file"
          accept=".json"
          onChange={handleApiKeyFileUpload}
          className={`file-input ${theme}`}
        />
        {apiKeyFile && (
          <div>
            <p>API Key File:</p>
            <pre>{JSON.stringify(apiKeyFile, null, 2)}</pre>
          </div>
        )}
        <button
          className={`btn-blue medium ${user.theme}`}
          onClick={() => { updateApiKey({ api_key: apiKeyFile }) }}>
          Save
        </button>



        {/* <h4>API</h4>
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
        /><br /> */}
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
        {apiError &&
          <div className='api error-box notched'>
            <p>{apiError.status === 401 ? "Invalid API Details!" : "Unknown Error"}</p>
          </div>
        }
        {/* {saving
          ? <p>Saving...</p>
          : <input className={`btn-store-api btn-blue medium ${user.theme}`} type="submit" name="submit" value="Store API details" />
        } */}
      </form>


      {/* </div> */}

      {/* </div> */}
    </div>
    // </div>
  );
}


export default NotActive;
