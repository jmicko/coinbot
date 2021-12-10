import React, { useState, useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import SingleUser from '../SingleUser/SingleUser'
import Admin from './Admin/Admin';
import API from './API/API';
import General from './General/General';
import Reset from './Reset/Reset';
import './Settings.css'
import SettingsNav from './SettingsNav/SettingsNav';



function Settings(props) {
  const [settingsPage, setSettingsPage] = useState('general');

  


  if (props.showSettings) {

    return (
      <div className="Settings">
        <button className="btn-logout btn-red" onClick={() => { props.clickSettings() }}>X</button>
        <h2 className="settings-header">Settings</h2>
        <SettingsNav setSettingsPage={setSettingsPage} />
        {
          {
            'general': <General />,
            'api': <API />,
            'reset': <Reset />,
            'admin': <Admin />
          }[settingsPage]
        }

        

















      </div>
    );
  } else {
    return (
      <></>
    );
  }
}

export default connect(mapStoreToProps)(Settings);
