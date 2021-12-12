import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './SettingsNav.css'


function SettingsNav(props) {

  return (
    <div className="SettingsNav">
      <center>
        <button className = {`btn-nav ${props.settingsPage === "general" && "selected"}`} onClick={() => { props.setSettingsPage('general') }}>General</button>
        <button className={`btn-nav ${props.settingsPage === "api" && "selected"}`} onClick={() => { props.setSettingsPage('api') }}>API</button>
        <button className={`btn-nav ${props.settingsPage === "reset" && "selected"}`} onClick={() => { props.setSettingsPage('reset') }}>Reset</button>
        <button className={`btn-nav ${props.settingsPage === "history" && "selected"}`} onClick={() => { props.setSettingsPage('history') }}>History</button>
        {props.store.accountReducer.userReducer.admin && <button className={`btn-nav ${props.settingsPage === "admin" && "selected"}`} onClick={() => { props.setSettingsPage('admin') }}>Admin</button>}
      </center>
    </div>
  );
}

export default connect(mapStoreToProps)(SettingsNav);