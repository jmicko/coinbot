import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './SettingsNav.css'


function SettingsNav(props) {

  return (
    <div className="SettingsNav">
      <center>
        <button>Nav Button</button>
        <button>Nav Button</button>
        <button>Nav Button</button>
        <button>Nav Button</button>
      </center>
    </div>
  );
}

export default connect(mapStoreToProps)(SettingsNav);