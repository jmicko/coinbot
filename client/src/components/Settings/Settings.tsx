import React, { useState } from 'react';
import Admin from './Admin/Admin';
// import AutoSetup from './AutoSetup/AutoSetup.js';
import General from './General/General';
import Products from './Products/Products';
import Investment from './Investment/Investment';
// import Reset from './Reset/Reset.js';
// import Feedback from './Feedback/Feedback.js';
import History from './History/History';
import SettingsNav from './SettingsNav/SettingsNav';
import BulkDelete from './BulkDelete/BulkDelete';
import Draggable, { DraggerProps } from '../Draggable/Draggable';

import './Settings.css'
import { useUser } from '../../contexts/useUser';
import { useData } from '../../contexts/useData';


function Settings() {
  const [settingsPage, setSettingsPage] = useState('general');
  const [tips, setTips] = useState(false);
  const { theme } = useUser();
  const { showSettings, setShowSettings } = useData();

  function BeforeDrag() {
    return (
      <button
        className={`btn-logout btn-red close-settings ${theme}`}
        onClick={() => { setShowSettings(!showSettings) }}
      >
        X
      </button>
    )
  }

  function AfterDrag({ collapseParent }: { collapseParent: boolean }) {
    return (
      <p className="info tips">
        {!collapseParent && <strong>Show Tips</strong>}
        {/* <br /> */}
        <input
          type="checkbox"
          checked={tips}
          onChange={() => setTips(!tips)}
        />
      </p>
    )
  }

  // receive props from Draggable component
  function SettingsPanel({ Dragger, collapseParent }: { Dragger: React.ComponentType<DraggerProps>, collapseParent: boolean }) {
    return (
      <>
        <Dragger
          // text={'Settings'}

          // header={() => <h2 className={`settings-header ${collapseParent && 'hide'}`}>Settings</h2>}
          beforeDrag={() => <BeforeDrag />}
          afterDrag={(props: { collapseParent: boolean }) => <AfterDrag {...props} />}
        />
        {!collapseParent && <SettingsNav setSettingsPage={setSettingsPage} settingsPage={settingsPage} />}
        <div className={`${collapseParent && 'hide'}`}>
          {
            {
              'general': <General tips={tips} />,
              'products': <Products tips={tips} />,
              'investment': <Investment tips={tips} />,
              // 'autoSetup': <AutoSetup tips={tips} priceTicker={props.priceTicker} />,
              'bulkDelete': <BulkDelete tips={tips} />,
              'history': <History tips={tips} />,
              // 'reset': <Reset tips={tips} />,
              // 'feedback': <Feedback tips={tips} />,
              'admin': <Admin tips={tips} />
            }[settingsPage]
          }
        </div>
      </>
    );
  }


  if (showSettings) {
    return (
      <Draggable
        children={SettingsPanel}
        className={`Settings ${theme}`}
      />
      // {/* <SettingsPanel clickSettings={props.clickSettings} product={props.product} priceTicker={props.priceTicker} /> */ }
    );
  }
}

export default Settings;
