import React, { useState } from 'react';
import './Home.css';

import Trade from '../Trade/Trade.js';
import Messages from '../Messages/Messages.js';
import Menu from '../Menu/Menu.js';
import TradeList from '../TradeList/TradeList.js';
import Status from '../Status/Status.js';
import Settings from '../Settings/Settings.js';
import NotApproved from '../NotApproved/NotApproved.js';
import NotActive from '../NotActive/NotActive.js';
import MobileNav from '../MobileNav/MobileNav.js';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import { useUser } from '../../contexts/UserContext.js';
import { devLog } from '../../shared.js';

function Home() {

  // devLog('rendering home');

  const { width, height } = useWindowDimensions();
  const { user } = useUser();

  const [showSettings, setShowSettings] = useState(false);
  const [mobilePage, setMobilePage] = useState('tradeList');
  const [tradeType, setTradeType] = useState('pair');

  // for checkbox to auto scroll
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const handleAutoScrollChange = () => {
    setIsAutoScroll(!isAutoScroll);
  };



  const clickSettings = () => {
    setShowSettings(!showSettings);
  }

  return (
    <div
      className={`Home ${user.theme}`}
      style={{
        height: height,
        // width: width
      }}>
      {/* {JSON.stringify(socket.product)}{JSON.stringify(product)} */}
      <Menu clickSettings={clickSettings} />

      {/* {width}w {height}h */}
      {
        // on mobile?
        width <= 800
          // show mobile page
          // which mobile page?
          ? mobilePage === 'newPair'
            // is the user active
            ? user.active
              ? <Trade setTradeType={setTradeType} tradeType={tradeType} />
              : <NotActive />
            : mobilePage === 'tradeList'
              // is the user approved
              ? user.approved
                ? <TradeList isAutoScroll={isAutoScroll} />
                : <NotApproved />
              : mobilePage === 'messages' && <Messages />

          // show all pages
          : <>
            {user.active
              ? <Trade setTradeType={setTradeType} tradeType={tradeType} />
              : <NotActive />}
            {user.approved
              ? <TradeList isAutoScroll={isAutoScroll} />
              : <NotApproved />}
              {/* {devLog('rendering messages in home')} */}
            <Messages />
          </>
        // 

      }

      <Status
        isAutoScroll={isAutoScroll}
        handleAutoScrollChange={handleAutoScrollChange}
      />
      <Settings
        showSettings={showSettings}
        clickSettings={clickSettings}
      />
      {width <= 800 && <MobileNav setMobilePage={setMobilePage} />}
    </div>
  );
}

export default Home;
