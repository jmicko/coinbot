import React, { useState } from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Confirm.css'

function Confirm(props) {

  return (
    <div className={`Confirm`}>
      <p>Are you sure?</p>
      <button onClick={props.execute}>Confirm</button>
      <button onClick={props.ignore}>Cancel</button>
    </div>
  )
}

export default connect(mapStoreToProps)(Confirm);