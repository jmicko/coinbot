import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './SettingsNav.css'


function SettingsNav(props) {

  return (
    <div className="SettingsNav">
      <center>
        <button className="btn-nav" onClick={() => { props.setSettingsPage('general') }}>General</button>
        <button className="btn-nav" onClick={() => { props.setSettingsPage('api') }}>API</button>
        <button className="btn-nav" onClick={() => { props.setSettingsPage('reset') }}>Reset</button>
        {props.store.accountReducer.userReducer.admin && <button className="btn-nav" onClick={() => { props.setSettingsPage('admin') }}>Admin</button>}
      </center>
    </div>
  );
}

export default connect(mapStoreToProps)(SettingsNav);