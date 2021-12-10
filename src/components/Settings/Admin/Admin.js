import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './Admin.css'


function Admin(props) {

  return (
    <div className="Admin">
      <center>
        <p>Admin Settings Page</p>
      </center>
    </div>
  );
}

export default connect(mapStoreToProps)(Admin);