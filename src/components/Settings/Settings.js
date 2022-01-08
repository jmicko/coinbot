import React, { useState } from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import Admin from './Admin/Admin';
import AutoSetup from './AutoSetup/AutoSetup';
import General from './General/General';
import Reset from './Reset/Reset';
import History from './History/History';
import './Settings.css'
import SettingsNav from './SettingsNav/SettingsNav';



function Settings(props) {
  const [settingsPage, setSettingsPage] = useState('general');

  if (props.showSettings) {
    return (
      <div className={`Settings ${props.theme}`}>
        <button className={`btn-logout btn-red ${props.store.accountReducer.userReducer.theme}`} onClick={() => { props.clickSettings() }}>X</button>
        <h2 className="settings-header">Settings</h2>
        <SettingsNav setSettingsPage={setSettingsPage} settingsPage={settingsPage} />
        {
          {
            'general': <General theme={props.theme} />,
            'history': <History theme={props.theme} />,
            'autoSetup': <AutoSetup theme={props.theme} />,
            'reset': <Reset theme={props.theme} />,
            'admin': <Admin theme={props.theme} />
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
