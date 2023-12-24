import { useMemo, useState } from 'react';
import Admin from './Admin/Admin';
import AutoSetup from './AutoSetup/AutoSetup';
import General from './General/General';
import Products from './Products/Products';
import Investment from './Investment/Investment';
import Reset from './Reset/Reset';
import Feedback from './Feedback/Feedback';
import History from './History/History';
import SettingsNav from './SettingsNav/SettingsNav';
import BulkDelete from './BulkDelete/BulkDelete';
// import Draggable, { DraggerProps } from '../Draggable/Draggable';
import Draggable from '../Draggable/Draggable';

import './Settings.css'
import { useUser } from '../../contexts/useUser';
import { useData } from '../../contexts/useData';


function Settings() {
  const [settingsPage, setSettingsPage] = useState('general');
  const [tips, setTips] = useState(false);
  const { theme } = useUser();

  const TipsCheck = useMemo(() => {
    return (
      <p className="info tips">
        <strong>Show Tips </strong>
        <input
          type="checkbox"
          checked={tips}
          onChange={() => setTips(!tips)}
        />
      </p>
    )
  }, [tips])

  return (
    <Draggable className={`Settings ${theme}`} windowBarElements={[TipsCheck]}>
      <div>
        <SettingsNav setSettingsPage={setSettingsPage} settingsPage={settingsPage} />
        {
          {
            'general': <General tips={tips} />,
            'products': <Products tips={tips} />,
            'investment': <Investment tips={tips} />,
            'autoSetup': <AutoSetup tips={tips} />,
            'bulkDelete': <BulkDelete tips={tips} />,
            'history': <History />,
            'reset': <Reset tips={tips} />,
            'feedback': <Feedback />,
            'admin': <Admin tips={tips} />
          }[settingsPage] // man this bit is clever. it's an object with a key that unlocks the desired component
        }
      </div>
    </Draggable>
  );
}

export default Settings;
