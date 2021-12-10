import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './SettingsNav.css'


function SettingsNav(props) {

  return (
    <div className="SettingsNav">
      <center>
        <button onClick={() => { props.setSettingsPage('general') }}>General</button>
        <button onClick={() => { props.setSettingsPage('api') }}>API</button>
        <button onClick={() => { props.setSettingsPage('reset') }}>Reset</button>
        {props.store.accountReducer.userReducer.admin && <button onClick={() => { props.setSettingsPage('admin') }}>Admin</button>}
      </center>
    </div>
  );
}

export default connect(mapStoreToProps)(SettingsNav);