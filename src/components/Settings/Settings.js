import React, { useState } from 'react';
import { useSelector } from 'react-redux';
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
  const user = useSelector((store) => store.accountReducer.userReducer);



  if (props.showSettings) {
    return (
      <div className={`Settings ${user.theme}`}>
        <button className={`btn-logout btn-red ${user.theme}`} onClick={() => { props.clickSettings() }}>X</button>

        <p className="info tips">
          <strong>Show Tips</strong>
          {/* <br /> */}
          <input
            type="checkbox"
            checked={tips}
            onChange={() => setTips(!tips)}
          />
        </p>

        <h2 className="settings-header">Settings</h2>

        <SettingsNav setSettingsPage={setSettingsPage} settingsPage={settingsPage} />
        {
          {
            'general': <General theme={user.theme} tips={tips} />,
            'investment': <Investment theme={user.theme} tips={tips} />,
            'autoSetup': <AutoSetup product={props.product} theme={user.theme} tips={tips} priceTicker={props.priceTicker} />,
            'bulkDelete': <BulkDelete theme={user.theme} tips={tips} />,
            'history': <History theme={user.theme} tips={tips} />,
            'reset': <Reset theme={user.theme} tips={tips} />,
            'admin': <Admin theme={user.theme} tips={tips} />
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

export default Settings;
