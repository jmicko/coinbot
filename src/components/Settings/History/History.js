import React, { useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './History.css'
import xlsx from 'json-as-xlsx'

function History(props) {
  const dispatch = useDispatch();

  async function exportXlxs() {
    dispatch({
      type: 'EXPORT_XLSX'
    })
  }

  async function exportCurrentJSON() {
    dispatch({
      type: 'EXPORT_CURRENT_JSON'
    })
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
      <button className={`btn-red medium ${props.theme}`} onClick={() => { exportCurrentJSON() }}>Export</button>
      <br></br>
      <br></br>
      <code>{JSON.stringify(props.store.accountReducer.currentJSONReducer)}</code>
      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(History);