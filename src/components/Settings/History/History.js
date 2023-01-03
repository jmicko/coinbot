import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './History.css'
import xlsx from 'json-as-xlsx'
import { granularities } from '../../../shared';

function History(props) {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const xlsxReducer = useSelector((store) => store.accountReducer.xlsxReducer);
  const currentJSONReducer = useSelector((store) => store.accountReducer.currentJSONReducer);
  const exportFilesReducer = useSelector((store) => store.accountReducer.exportFilesReducer);
  const products = useSelector((store) => store.accountReducer.productsReducer);

  const [jsonImport, setJSONImport] = useState('');
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);
  // end should start as the current date withouth the time
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  // start should start as 30 days ago
  const [start, setStart] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [granularity, setGranularity] = useState('ONE_MINUTE');

  function handleIgnoreDuplicates() {
    setIgnoreDuplicates(!ignoreDuplicates)
  }

  async function exportXlxs() {
    dispatch({
      type: 'EXPORT_XLSX'
    })
  }

  async function exportCandleXlxs() {
    dispatch({
      type: 'EXPORT_CANDLE_XLSX',
      payload: {
        product: props.product,
        granularity: granularity,
        start: start,
        end: end
      }
    })
  }

  // fetch list of files that are available to download
  async function fetchExportFiles() {
    dispatch({
      type: 'FETCH_EXPORT_FILES'
    })
  }

  // fetch list of files that are available to download on component load
  useEffect(() => {
    fetchExportFiles();
  }, [])

  // download a file
  async function downloadFile(file) {
    dispatch({
      type: 'DOWNLOAD_FILE',
      payload: file
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
    if (jsonImport) {

      dispatch({
        type: 'IMPORT_CURRENT_JSON',
        payload: {
          jsonImport: jsonImport,
          ignoreDuplicates: ignoreDuplicates
        }
      })
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(jsonImport);
  }

  useEffect(() => {

    if (xlsxReducer?.data) {

      let settings = {
        fileName: 'Coinbot Orders Export ' + new Date().toLocaleString('en-US'), // Name of the resulting spreadsheet
        extraLength: 3, // A bigger number means that columns will be wider
        writeOptions: {} // Style options from https://github.com/SheetJS/sheetjs#writing-options
      }

      xlsx(xlsxReducer.data, settings);
      dispatch({
        type: 'UNSET_XLSX'
      })
    }

  }, [xlsxReducer, dispatch])


  return (
    <div className="History settings-panel scrollable">

      <div className="divider" />
      <h4>Candles</h4>
      <p>
        select a date range and granularity and a file will be generated for you to download. This may take a few minutes. 
        The file will be available for download in the "Available files to download" section below.
      </p>
      {/* {JSON.stringify(start)}
      <br />
      {JSON.stringify(end)} */}
      {/* add two date selectors. one tied to the start value, one tied to the end value */}
      <label htmlFor="start">Start date:</label>
      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      <label htmlFor="end"> End date:</label>
      <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      <br />
      <br />

      {/* selector to pick the granularity */}
      <label htmlFor="granularity">Granularity:</label>
      <select
        name="granularity"
        id="granularity"
        value={granularity}
        onChange={(e) => setGranularity(e.target.value)}
      >
        {granularities.map((granularity, index) => {
          return (
            <option key={index} value={granularity.name}>{granularity.readable}</option>
          )
        })}
      </select>


      {/* buttons to export for each granularity */}
      {/* {granularities.map((granularity, index) => {
        return (
          <>
            <button className={`btn-red medium ${user.theme}`} key={index} onClick={() => exportCandleXlxs(granularity.name)}>Export {granularity.readable} Granularity</button>
            <br />
          </>
        )
      })} */}
      <br />
      <br />
      <button className={`btn-red medium ${user.theme}`} onClick={() => { exportCandleXlxs() }}>Generate</button>

      {/* display the list of files that are available to download from the account reducer.
      the reducer is just an array of file names */}
      <br />
      <p>Available files to download:</p>
      {/* {JSON.stringify(exportFilesReducer)} */}
      {exportFilesReducer?.map((file, index) => {
        return (
          <div key={index}>
            {/* each file should be a link that will call the download function */}
            <a href="#" onClick={() => { downloadFile(file) }}>{file}</a>
          </div>
        )
      })}



      <div className="divider" />
      <h4>Export .xlsx spreadsheet</h4>
      <p>
        Export and download your entire trade history as an xlsx spreadsheet.
      </p>
      <button className={`btn-red medium ${user.theme}`} onClick={() => { exportXlxs() }}>Export</button>
      <div className="divider" />
      <h4>Export current trade-pairs</h4>
      <p>
        Export all your current trade-pairs in JSON format.
        {/* You can copy this to a text document
        and use it later to import the same trades. This is useful if you want to transfer your
        trades to a different bot and can't or don't want to mess around with the database. */}
      </p>
      {currentJSONReducer
        ? <button className={`btn-red medium ${user.theme}`} onClick={() => { exportCurrentJSON('clear') }}>Clear</button>
        : <button className={`btn-red medium ${user.theme}`} onClick={() => { exportCurrentJSON() }}>Export</button>
      }
      <br></br>
      <br></br>
      {currentJSONReducer
        && <button className={`btn-blue medium ${user.theme}`} onClick={() => { copyToClipboard() }}>copy</button>
      }
      <br></br>
      {currentJSONReducer
        && <code>{JSON.stringify(currentJSONReducer)}</code>
      }
      <div className="divider" />
      {/* 
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

      <div className='left-border'>

        <label htmlFor="json_input">
          JSON String:
        </label>
        <input
          className='json_input'
          type="text"
          name="json_input"
          value={jsonImport}
          required
          onChange={(event) => setJSONImport(event.target.value)}
        />
        <br />

        <input
          name="ignore_duplicates"
          type="checkbox"
          checked={ignoreDuplicates}
          onChange={handleIgnoreDuplicates}
        />
        <label htmlFor="ignore_duplicates">
          Ignore Duplicates:
        </label>
        <br />

        <button className={`import-button btn-red medium ${user.theme}`} onClick={() => { importCurrentJSON() }}>Import</button>
        <br />
      </div>
      <div className="divider" /> */}
    </div>
  );
}

export default History;