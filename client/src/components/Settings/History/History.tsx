import { useEffect, useState } from 'react';
import './History.css'
// import xlsx from 'json-as-xlsx'
import { granularities } from '../../../shared.js';
import { useUser } from '../../../hooks/useUser.js';
import { useData } from '../../../hooks/useData.js';
import useGetFetch from '../../../hooks/useGetFetch.js';
import usePutFetch from '../../../hooks/usePutFetch.js';
import useDownloadFile from '../../../hooks/useDownloadFile.js';
// import useDownloadFile from '../../../hooks/useDownloadFile';
// import { useFetchData } from '../../../hooks/fetchData.js';

function History() {
  const { user, refreshUser, theme } = useUser();
  const { productID } = useData();
  const {
    data: exportableFiles,
    refresh: refreshExportableFiles,
  } = useGetFetch('/none', {
    url: `/api/account/exportableFiles`,
    defaultState: [],
    from: 'exportableFiles in History',
    preload: true,
  })
  // const { downloadFile } = useFetchData(`/api/account/downloadFile`, { noLoad: true, refreshUser });
  const { downloadFile, downloadTxt } = useDownloadFile({
    url: `/api/account/downloadFile`,
    from: 'downloadFile in History'
  })
  // const { updateData: generateCandleFile }
  //   = useFetchData(`/api/account/exportCandles`, { noLoad: true, refreshUser });
  const { putData: generateCandleFile } = usePutFetch({
    url: `/api/account/exportCandles`,
    refreshCallback: refreshExportableFiles,
    from: 'generateCandleFile in History',
  })
  // const { data: currentJSON, refresh: refreshCurrentJSON, clear: clearJSON }
  //   = useFetchData(`/api/account/exportCurrentJSON`, { noLoad: true, refreshUser });
  const {
    data: currentJSON,
    refresh: exportCurrentJSON,
    clear: clearCurrentJSON,
  } = useGetFetch('/none', {
    url: `/api/account/exportCurrentJSON`,
    defaultState: null,
    from: 'currentJSON in History',
    preload: false,
  })

  // maybe bring these back later
  // const [jsonImport, setJSONImport] = useState('');
  // const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);

  // end should start as the current date without the time
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  // start should start as 30 days ago
  const [start, setStart] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [granularity, setGranularity] = useState('ONE_MINUTE');

  async function exportCandleXlsx() {
    await generateCandleFile({
      product: productID,
      granularity: granularity,
      start: start,
      end: end
    })
    refreshUser();
  }

  useEffect(() => {
    const refresh = async () => {
      await refreshUser();
      await refreshExportableFiles();
    }

    let timer: NodeJS.Timeout;

    if (user.exporting) {
      timer = setTimeout(() => {
        refresh();
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [user, refreshUser, refreshExportableFiles])

  function copyToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(currentJSON));
  }

  return (
    <div className="History settings-panel scrollable">

      <div className={`divider ${theme}`} />
      <h4>Candles</h4>
      <p>
        select a date range and granularity and a file will be generated for you to download.
        This may take a few minutes.
        The file will be available for download in the "Available files to download" section below.
        If there are more than 5 files at any time, the oldest file will be deleted.
      </p>
      {/* {JSON.stringify(user)} */}
      {/* <br /> */}
      {/* {JSON.stringify(end)} */}
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

      <br />
      <br />
      {!user.exporting
        ? <button
          className={`btn-red medium ${user.theme}`}
          onClick={() => { exportCandleXlsx() }}
        >Generate</button>
        : <p>Generating...</p>
      }

      {/* display the list of files that are available to download from the account reducer.
      the state is just an array of file names */}
      <br />
      <p>Available files to download:</p>
      {exportableFiles?.map((file, index) => {
        return (
          <div key={index}>
            {/* each file should be a link that will call the download function */}
            <button
              className={`btn-yellow btn-file ${user.theme}`}
              onClick={() => { downloadFile(file, 'xlsx') }}
            >{file}</button>
            <br />
            {/* <br /> */}
          </div>
        )
      })}



      <div className={`divider ${theme}`} />

      {/*       
      <h4>Export .xlsx spreadsheet</h4>
      <p>
        Export and download your entire trade history as an xlsx spreadsheet.
      </p>
      <button className={`btn-red medium ${user.theme}`} onClick={() => { exportXlsx() }}>Export</button>
      <div className={`divider ${theme}`} />
 */}


      <h4>Export current trade-pairs</h4>
      {!currentJSON &&
        <p>
          Export all your current trade-pairs in JSON format.
          {/* You can copy this to a text document
        and use it later to import the same trades. This is useful if you want to transfer your
      trades to a different bot and can't or don't want to mess around with the database. */}
        </p>
      }
      {!currentJSON &&
        <button
          className={`btn-red medium ${user.theme}`}
          onClick={() => { exportCurrentJSON() }}
        >Export</button>
      }
      {currentJSON &&
        <p>
          Copy it into your clipboard and paste it somewhere, or just download it as a .txt file.
        </p>
      }
      {currentJSON &&
        <button
          className={`btn-blue medium ${user.theme}`}
          onClick={() => { copyToClipboard() }}
        >Copy All</button>
      }
      &nbsp;
      {currentJSON &&
        <button
          className={`btn-yellow btn-file medium ${user.theme}`}
          onClick={() => downloadTxt(JSON.stringify(currentJSON),
            `${productID}_active_trades_${new Date().toISOString().slice(0, 10)}.txt`)}
        >Download as .txt
        </button>
      }
      <br />
      {currentJSON &&
        <textarea
          rows={4}
          cols={29}
          value={JSON.stringify(currentJSON)}
          // don't allow editing of the text area
          readOnly
        />
      }
      <br />
      {currentJSON &&
        <button
          className={`btn-red medium ${user.theme}`}
          onClick={() => { clearCurrentJSON() }}
        >Clear</button>}
      <div className={`divider ${theme}`} />
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
      <div className={`divider ${theme}`} /> */}
    </div>
  );
}

export default History;