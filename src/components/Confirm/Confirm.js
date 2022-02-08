import React, { useState } from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Confirm.css'

function Confirm(props) {

  return (
    <div className={`Confirm`}>
      <center>

        <p>Are you sure?</p>
        <button className={`btn-green medium ${props.store.accountReducer.userReducer.theme}`} onClick={props.execute}>Confirm</button>
        <button className={`btn-red medium ${props.store.accountReducer.userReducer.theme}`} onClick={props.ignore}>Cancel</button>
      </center>
    </div>
  )
}

export default connect(mapStoreToProps)(Confirm);