import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './History.css'
import xlsx from 'json-as-xlsx'

function History(props) {
  const dispatch = useDispatch();

  const [jsonImport, setJSONImport] = useState('');

  async function exportXlxs() {
    dispatch({
      type: 'EXPORT_XLSX'
    })
  }

  async function exportCurrentJSON(params) {
    if (params === 'clear') {
      dispatch({
        type: 'UNSET_CURRENT_JSON'
      })
    } else {
      dispatch({
        type: 'EXPORT_CURRENT_JSON'
      })
    }
  }

  async function importCurrentJSON() {
    console.log('json import:', jsonImport);
    dispatch({
      type: 'IMPORT_CURRENT_JSON',
      payload: { jsonImport: jsonImport }
    })
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(jsonImport);
  }

  useEffect(() => {

    if (props?.store?.accountReducer?.xlsxReducer?.data) {

      let settings = {
        fileName: 'Coinbot Orders Export ' + new Date().toLocaleString('en-US'), // Name of the resulting spreadsheet
        extraLength: 3, // A bigger number means that columns will be wider
        writeOptions: {} // Style options from https://github.com/SheetJS/sheetjs#writing-options
      }

      xlsx(props.store.accountReducer.xlsxReducer.data, settings);
      dispatch({
        type: 'UNSET_XLSX'
      })
    }

  }, [props.store.accountReducer.xlsxReducer, dispatch])


  return (
    <div className="History settings-panel scrollable">

      <div className="divider" />
      <h4>Export .xlsx spreadsheet</h4>
      <p>
        Export and download your entire trade history as an xlsx spreadsheet.
      </p>
      <button className={`btn-red medium ${props.theme}`} onClick={() => { exportXlxs() }}>Export</button>
      <div className="divider" />
      <h4>Export current trade-pairs</h4>
      <p>
        Export all your current trade-pairs in JSON format. You can copy this to a text document
        and use it later to import the same trades. This is useful if you want to transfer your
        trades to a different bot and can't or don't want to mess around with the database.
      </p>
      {props.store.accountReducer.currentJSONReducer
        ? <button className={`btn-red medium ${props.theme}`} onClick={() => { exportCurrentJSON('clear') }}>Clear</button>
        : <button className={`btn-red medium ${props.theme}`} onClick={() => { exportCurrentJSON() }}>Export</button>
      }
      <br></br>
      <br></br>
      {props.store.accountReducer.currentJSONReducer
        && <button className={`btn-blue medium ${props.theme}`} onClick={() => { copyToClipboard() }}>copy</button>
      }
      <br></br>
      {props.store.accountReducer.currentJSONReducer
        && <code>{JSON.stringify(props.store.accountReducer.currentJSONReducer)}</code>
      }
      <div className="divider" />

      <h4>Import current trade-pairs</h4>
      <p>
        Import a JSON string that has previously been exported. It is recommended not to import old
        trades that have already been processed as this will mess up your history and throw off
        your profit calculation.
      </p>
      <p>
        Generally you don't want to do this if your bot has been unpaused and running for a while
        since you exported.
      </p>
      <p>
        Just past the entire string into that text box and press the Import button.
      </p>

      <label htmlFor="json_input">
        Import:
      </label>
      <input
        type="text"
        name="json_input"
        value={jsonImport}
        required
        onChange={(event) => setJSONImport(event.target.value)}
      />

      <button className={`btn-red medium ${props.theme}`} onClick={() => { importCurrentJSON() }}>Import</button>
      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(History);