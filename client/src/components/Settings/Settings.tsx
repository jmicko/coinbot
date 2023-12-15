import React, { useState } from 'react';
// import Admin from './Admin/Admin.js';
// import AutoSetup from './AutoSetup/AutoSetup.js';
// import General from './General/General.js';
// import Products from './Products/Products.js';
// import Investment from './Investment/Investment.js';
// import Reset from './Reset/Reset.js';
// import Feedback from './Feedback/Feedback.js';
// import History from './History/History.js';
import SettingsNav from './SettingsNav/SettingsNav';
// import BulkDelete from './BulkDelete/BulkDelete.js';
import { useUser } from '../../contexts/UserContext.js';
import { useData } from '../../contexts/DataContext.js';
import Draggable from '../Draggable/Draggable';

import './Settings.css'


function Settings(props) {
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
  function SettingsPanel({ Dragger, collapseParent }: { Dragger: React.ComponentType<any>, collapseParent: boolean }) {
    return (
      <>
        <Dragger
          text={'Settings'}

          // header={() => <h2 className={`settings-header ${collapseParent && 'hide'}`}>Settings</h2>}
          beforeDrag={() => <BeforeDrag />}
          afterDrag={(props: { collapseParent: boolean }) => <AfterDrag {...props} />}
        />
        {!collapseParent && <SettingsNav setSettingsPage={setSettingsPage} settingsPage={settingsPage} />}
        <div className={`${collapseParent && 'hide'}`}>
          {
            {
              // 'general': <General product={props.product} theme={theme} tips={tips} />,
              // 'products': <Products product={props.product} theme={theme} tips={tips} />,
              // 'investment': <Investment product={props.product} theme={theme} tips={tips} />,
              // 'autoSetup': <AutoSetup product={props.product} theme={theme} tips={tips} priceTicker={props.priceTicker} />,
              // 'bulkDelete': <BulkDelete product={props.product} theme={theme} tips={tips} />,
              // 'history': <History product={props.product} theme={theme} tips={tips} />,
              // 'reset': <Reset product={props.product} theme={theme} tips={tips} />,
              // 'feedback': <Feedback product={props.product} theme={theme} tips={tips} />,
              // 'admin': <Admin product={props.product} theme={theme} tips={tips} />
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
