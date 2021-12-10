import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './General.css'


function General(props) {

  return (
    <div className="General">
      <center>
        <p>General Settings Page</p>
      </center>
    </div>
  );
}

export default connect(mapStoreToProps)(General);