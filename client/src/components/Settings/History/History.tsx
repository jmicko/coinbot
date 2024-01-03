// import { useEffect, useMemo, useState } from 'react';
import './History.css'
// import xlsx from 'json-as-xlsx'
// import { granularities } from '../../../shared.js';
import { useUser } from '../../../hooks/useUser.js';
// import { useData } from '../../../hooks/useData.js';
// import useGetFetch from '../../../hooks/useGetFetch.js';
// import usePutFetch from '../../../hooks/usePutFetch.js';
// import useDownloadFile from '../../../hooks/useDownloadFile.js';
// import Collapser from '../../Collapser/Collapser.js';
// import useDownloadFile from '../../../hooks/useDownloadFile';
// import { useFetchData } from '../../../hooks/fetchData.js';

function History() {
  const {  theme } = useUser();
  // const { productID } = useData();


  // const { downloadFile } = useFetchData(`/api/account/downloadFile`, { noLoad: true, refreshUser });

  // const { updateData: generateCandleFile }
  //   = useFetchData(`/api/account/exportCandles`, { noLoad: true, refreshUser });

  // const { data: currentJSON, refresh: refreshCurrentJSON, clear: clearJSON }
  //   = useFetchData(`/api/account/exportCurrentJSON`, { noLoad: true, refreshUser });


  // maybe bring these back later
  // const [jsonImport, setJSONImport] = useState('');
  // const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);







  return (
    <div className="History settings-panel scrollable">

      <div className={`divider ${theme}`} />
      {/* <h4>Candles</h4> */}


      <div className={`divider ${theme}`} />

      {/*       
      <h4>Export .xlsx spreadsheet</h4>
      <p>
        Export and download your entire trade history as an xlsx spreadsheet.
      </p>
      <button className={`btn-red medium ${user.theme}`} onClick={() => { exportXlsx() }}>Export</button>
      <div className={`divider ${theme}`} />
 */}


      {/* <h4>Export current trade-pairs</h4> */}

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