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
    </div>
  );
}

export default connect(mapStoreToProps)(History);