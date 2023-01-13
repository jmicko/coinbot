import React, { useState } from 'react';
import Admin from './Admin/Admin';
import AutoSetup from './AutoSetup/AutoSetup';
import General from './General/General';
import Products from './Products/Products';
import Investment from './Investment/Investment';
import Reset from './Reset/Reset';
import History from './History/History';
import './Settings.css'
import SettingsNav from './SettingsNav/SettingsNav';
import BulkDelete from './BulkDelete/BulkDelete';
import { useUser } from '../../contexts/UserContext';



function Settings(props) {
  const [settingsPage, setSettingsPage] = useState('general');
  const [tips, setTips] = useState(false);
  const { user } = useUser();



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
            'general': <General product={props.product} theme={user.theme} tips={tips} />,
            'products': <Products product={props.product} theme={user.theme} tips={tips} />,
            'investment': <Investment product={props.product} theme={user.theme} tips={tips} />,
            'autoSetup': <AutoSetup product={props.product} theme={user.theme} tips={tips} priceTicker={props.priceTicker} />,
            'bulkDelete': <BulkDelete product={props.product} theme={user.theme} tips={tips} />,
            'history': <History product={props.product} theme={user.theme} tips={tips} />,
            'reset': <Reset product={props.product} theme={user.theme} tips={tips} />,
            'admin': <Admin product={props.product} theme={user.theme} tips={tips} />
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
