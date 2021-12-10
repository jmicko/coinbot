import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './API.css'


function API(props) {

  return (
    <div className="API">
      <center>
        <p>API Settings Page</p>
      </center>
    </div>
  );
}

export default connect(mapStoreToProps)(API);