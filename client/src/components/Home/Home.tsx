import { useEffect, useState } from 'react';
import './Home.css';

import Trade from '../Trade/Trade';
import Messages from '../Messages/Messages';
import Menu from '../Menu/Menu.js';
import TradeList from '../TradeList/TradeList';
import Status from '../Status/Status';
import Settings from '../Settings/Settings';
// import NotApproved from '../NotApproved/NotApproved.js';
// import NotActive from '../NotActive/NotActive.js';
import MobileNav from '../MobileNav/MobileNav';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import { useUser } from '../../contexts/useUser.js';
import { useData } from '../../contexts/useData.js';
import NotActive from '../NotActive/NotActive.js';
import NotApproved from '../NotApproved/NotApproved.js';
// import useLocalStorage from '../../hooks/useLocalStorage.js';
// import { useData } from '../../contexts/DataContext';
// import { devLog } from '../../shared.js';

function Home() {

  const { width, height } = useWindowDimensions();
  const { user } = useUser(); MobileNav
  const { showSettings } = useData();
  const [
    isLoaded,
    // setIsLoaded
  ] = useState(false);
  // const [hasRotated, setHasRotated] = useLocalStorage('hasRotated', false);

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     if (hasRotated) return;
  //     setIsLoaded(true);
  //     setHasRotated(true);
  //   }, 25000);

  //   return () => clearTimeout(timer); // cleanup on unmount
  // }, []);

  // const { showSettings } = useData();
  const [mobilePage, setMobilePage] = useState('tradeList');
  // const [tradeType, setTradeType] = useState('pair');

  return (
    <div
      className={`Home rotate ${user?.theme} ${isLoaded ? 'loaded' : ''}`}
      style={{
        height: height,
      }}>
      <Menu />
      {
        // on mobile?
        width <= 800
          // show mobile page
          // which mobile page?
          ? mobilePage === 'newPair'
            // is the user active
            ? user?.active
              // ? <></>
              ? <Trade />
              : <NotActive />
            // : <></>
            : mobilePage === 'tradeList'
              // is the user approved
              ? user?.approved
                ? <TradeList />
                // ? <></>
                : <NotApproved />
              // : <></>
              : mobilePage === 'messages' && <Messages />

          // show all pages on desktop
          : <>
            {user?.active
              ? <Trade />
              : <NotActive />
              // : <></>
            }
            {user?.approved
              ? <TradeList />
              : <NotApproved />
              // : <></>
            }
            {/* {devLog('rendering messages in home')} */}
            <Messages />
          </>
      }

      <Status />
      {showSettings && <Settings />}
      {width < 800 && <MobileNav
        setMobilePage={setMobilePage}
        mobilePage={mobilePage}
      />}
    </div>
  );
}

export default Home;
