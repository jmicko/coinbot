import React, { useState } from 'react';
import Admin from './Admin/Admin.js';
import AutoSetup from './AutoSetup/AutoSetup.js';
import General from './General/General.js';
import Products from './Products/Products.js';
import Investment from './Investment/Investment.js';
import Reset from './Reset/Reset.js';
import History from './History/History.js';
import './Settings.css'
import SettingsNav from './SettingsNav/SettingsNav.js';
import BulkDelete from './BulkDelete/BulkDelete.js';
import { useUser } from '../../contexts/UserContext.js';



function Settings(props) {
  const [settingsPage, setSettingsPage] = useState('general');
  const [tips, setTips] = useState(false);
  const { theme } = useUser();



  if (props.showSettings) {
    return (
      <div className={`Settings ${theme}`}>
        <button className={`btn-logout btn-red ${theme}`} onClick={() => { props.clickSettings() }}>X</button>

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
            'general': <General product={props.product} theme={theme} tips={tips} />,
            'products': <Products product={props.product} theme={theme} tips={tips} />,
            'investment': <Investment product={props.product} theme={theme} tips={tips} />,
            'autoSetup': <AutoSetup product={props.product} theme={theme} tips={tips} priceTicker={props.priceTicker} />,
            'bulkDelete': <BulkDelete product={props.product} theme={theme} tips={tips} />,
            'history': <History product={props.product} theme={theme} tips={tips} />,
            'reset': <Reset product={props.product} theme={theme} tips={tips} />,
            'admin': <Admin product={props.product} theme={theme} tips={tips} />
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
