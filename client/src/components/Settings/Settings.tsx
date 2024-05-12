import { useMemo, useState } from 'react';
import Admin from './Admin/Admin';
import AutoSetup from './AutoSetup/AutoSetup';
import General from './General/General';
import Products from './Products/Products';
import Portfolio from './Portfolio/Portfolio';
import Feedback from './Feedback/Feedback';
import Draggable from '../Draggable/Draggable';

import './Settings.css'
import { useUser } from '../../hooks/useUser';

function Settings() {
  const [settingsPage, setSettingsPage] = useState('General');
  const [tips, setTips] = useState(false);
  const { user, theme } = useUser();

  const TipsCheck = useMemo(() => {
    return (
      <p className="info tips">
        <strong>Show Tips </strong>
        <input
          name="tips"
          type="checkbox"
          checked={tips}
          onChange={() => setTips(!tips)}
        />
      </p>
    )
  }, [tips])

  interface SettingsPages {
    [key: string]: JSX.Element
  }

  const settingsPages: SettingsPages = useMemo(() => ({
    'General': <General tips={tips} />,
    'Portfolio': <Portfolio tips={tips} />,
    'Auto Setup': <AutoSetup tips={tips} />,
    'Products': <Products tips={tips} />,
    'Feedback': <Feedback />,
    'Admin': <Admin tips={tips} />
  }), [tips])

  return (
    <Draggable className={`Settings ${theme}`} windowBarElements={[TipsCheck]}>
      <div className="SettingsNav">
        {Object.keys(settingsPages).map((page, i) => {
          return (
            page === 'Admin' && !user.admin
              ? null
              : <button
                key={i}
                className={`btn-nav ${theme} ${settingsPage === page && "selected"}`}
                onClick={() => { setSettingsPage(page) }}
              >{page}</button>
          )
        })}
      </div>
      {settingsPages[settingsPage]} {/* man this bit is clever. it's an object with a key that unlocks the desired component */}
    </Draggable>
  );
}

export default Settings;
