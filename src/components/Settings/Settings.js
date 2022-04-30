import React, { useState } from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import Admin from './Admin/Admin';
import AutoSetup from './AutoSetup/AutoSetup';
import General from './General/General';
import Investment from './Investment/Investment';
import Reset from './Reset/Reset';
import History from './History/History';
import './Settings.css'
import SettingsNav from './SettingsNav/SettingsNav';
import BulkDelete from './BulkDelete/BulkDelete';



function Settings(props) {
  const [settingsPage, setSettingsPage] = useState('general');
  const [tips, setTips] = useState(false);



  if (props.showSettings) {
    return (
      <div className={`Settings ${props.theme}`}>
        <button className={`btn-logout btn-red ${props.store.accountReducer.userReducer.theme}`} onClick={() => { props.clickSettings() }}>X</button>

        <p className="info tips">
          <strong>Show Tips</strong>
          {/* <br /> */}
          <input
            type="checkbox"
            id="topping"
            name="topping"
            value="Paneer"
            checked={tips}
            onChange={() => setTips(!tips)}
          />
        </p>

        <h2 className="settings-header">Settings</h2>

        <SettingsNav setSettingsPage={setSettingsPage} settingsPage={settingsPage} />
        {
          {
            'general': <General theme={props.theme} tips={tips} />,
            'investment': <Investment theme={props.theme} tips={tips} />,
            'autoSetup': <AutoSetup theme={props.theme} tips={tips} priceTicker={props.priceTicker} />,
            'bulkDelete': <BulkDelete theme={props.theme} tips={tips} />,
            'history': <History theme={props.theme} tips={tips} />,
            'reset': <Reset theme={props.theme} tips={tips} />,
            'admin': <Admin theme={props.theme} tips={tips} />
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
