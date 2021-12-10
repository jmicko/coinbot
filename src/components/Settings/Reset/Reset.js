import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './Reset.css'


function Reset(props) {

  return (
    <div className="Reset">
      <center>
        <p>Reset Settings Page</p>
      </center>
    </div>
  );
}

export default connect(mapStoreToProps)(Reset);