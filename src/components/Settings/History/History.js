import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './History.css'


function History(props) {
  const dispatch = useDispatch();

  function exportXlxs() {
    console.log('exporting spreadsheet');
    dispatch({
      type: 'EXPORT_XLSX'
    })
  }


  return (
    <div className="History">

      <div className="divider" />
      <h4>Export .xlsx spreadsheet</h4>
      <p>
        Export and download your entire trade history as an xlsx spreadsheet. I'm adding extra words here instead of doing proper CSS.
      </p>
      <button className={`btn-red medium ${props.theme}`} onClick={() => { exportXlxs() }}>Export</button>


      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(History);