import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Trade from '../Trade/Trade.js';
import Messages from '../Messages/Messages.js';
import Menu from '../Menu/Menu'
import TradeList from '../TradeList/TradeList'
import Status from '../Status/Status'
import Settings from '../Settings/Settings'
import './Home.css'
import NotApproved from '../NotApproved/NotApproved.js';
import NotActive from '../NotActive/NotActive.js';
import MobileNav from '../MobileNav/MobileNav.js';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';

function Home() {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const { height, width } = useWindowDimensions();

  const [showSettings, setShowSettings] = useState(false);
  const [mobilePage, setMobilePage] = useState('tradeList');
  const [tradeType, setTradeType] = useState('pair');

  // for checkbox to auto scroll
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const handleAutoScrollChange = () => {
    setIsAutoScroll(!isAutoScroll);
  };

  useEffect(() => {
    dispatch({ type: 'FETCH_ORDERS' });
    dispatch({ type: 'FETCH_PROFITS' });
  }, [dispatch]);


  const clickSettings = () => {
    setShowSettings(!showSettings);
    if (user.admin) {
      dispatch({ type: 'FETCH_USERS' });
    }
  }


  return (
    <div className={`Home ${user.theme}`}>
      {/* {JSON.stringify(mobilePage)} */}
      <Menu clickSettings={clickSettings} />


      {
        // on mobile?
        width < 800
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
            <Messages />
          </>
        // 

      }





      {/* {
        user.active
          ? width < 800 && mobilePage === 'newPair'
            ? <Trade setTradeType={setTradeType} tradeType={tradeType} />
            : width > 800 && <Trade setTradeType={setTradeType} tradeType={tradeType} />
          : width < 800 && mobilePage === 'newPair'
            ? <NotActive />
            : width > 800 && <NotActive />
      }

      {
        user.approved
          ? width < 800 && mobilePage === 'tradeList'
            ? <TradeList isAutoScroll={isAutoScroll} />
            : width > 800 && <TradeList isAutoScroll={isAutoScroll} />
          : width < 800 && mobilePage === 'tradeList'
            ? <NotApproved />
            : width > 800 && <NotApproved />
      }

      {width < 800 && mobilePage === 'messages'
        ? <Messages />
        : width > 800 && <Messages />} */}

      <Status
        isAutoScroll={isAutoScroll}
        handleAutoScrollChange={handleAutoScrollChange}
      />
      <Settings
        showSettings={showSettings}
        clickSettings={clickSettings}
      />
      {width < 800 && <MobileNav setMobilePage={setMobilePage} />}
    </div>
  );
}

export default Home;
