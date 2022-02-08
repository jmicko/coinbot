import React, { useState } from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Confirm.css'

function Confirm(props) {

  return (
    <div className={`Single-trade`}>
      <p>Are you sure?</p>
    </div>
  )
}

export default connect(mapStoreToProps)(Confirm);