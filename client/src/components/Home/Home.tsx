import { useState } from 'react';
import './Home.css';

import Trade from '../Trade/Trade';
// import Messages from '../Messages/Messages.js';
import Menu from '../Menu/Menu.js';
import TradeList from '../TradeList/TradeList';
import Status from '../Status/Status';
import Settings from '../Settings/Settings';
// import NotApproved from '../NotApproved/NotApproved.js';
// import NotActive from '../NotActive/NotActive.js';
import MobileNav from '../MobileNav/MobileNav';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import { useUser } from '../../contexts/UserContext';
// import { useData } from '../../contexts/DataContext';
// import { devLog } from '../../shared.js';

function Home() {

  const { width, height } = useWindowDimensions();
  const { user } = useUser(); MobileNav

  // const { showSettings } = useData();
  const [mobilePage, setMobilePage] = useState('tradeList');
  // const [tradeType, setTradeType] = useState('pair');

  // for checkbox to auto scroll
  // const [isAutoScroll, setIsAutoScroll] = useState(true);

  // const handleAutoScrollChange = () => {
  //   setIsAutoScroll(!isAutoScroll);
  // };

  return (
    <div
      className={`Home ${user.theme}`}
      style={{
        height: height,
        // width: width
      }}>
      {/* {JSON.stringify(user)} */}
      {/* {JSON.stringify(socket.product)}{JSON.stringify(product)} */}
      <Menu />

      {/* {width}w {height}h */}
      {
        // on mobile?
        width <= 800
          // show mobile page
          // which mobile page?
          ? mobilePage === 'newPair'
            // is the user active
            ? user.active
              // ? <></>
              ? <Trade />
              // : <NotActive />
              : <></>
            : mobilePage === 'tradeList'
              // is the user approved
              ? user.approved
                ? <TradeList
                // isAutoScroll={isAutoScroll} 
                />
                // ? <></>
                // : <NotApproved />
                : <></>
              // : mobilePage === 'messages' && <Messages />
              : mobilePage === 'messages' && <></>

          // show all pages
          : <>
            {user.active
              ? <Trade />
              // ? <></>
              // : <NotActive />
              : <></>
            }
            {user.approved
              ? <TradeList
              // isAutoScroll={isAutoScroll}
              />
              // ? <></>
              // : <NotApproved />
              : <></>
            }
            {/* {devLog('rendering messages in home')} */}
            {/* <Messages /> */}
          </>
        // 

      }

      <Status />
      <Settings />
      {width < 800 && <MobileNav
        setMobilePage={setMobilePage}
        mobilePage={mobilePage}
      />}
    </div>
  );
}

export default Home;
