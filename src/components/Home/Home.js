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
import { useSocket } from '../../contexts/SocketProvider.js';

function Home() {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const { height, width } = useWindowDimensions();
  const socket = useSocket();

  const [product, setProduct] = useState('BTC-USD');
  const [showSettings, setShowSettings] = useState(false);
  const [mobilePage, setMobilePage] = useState('tradeList');
  const [tradeType, setTradeType] = useState('pair');

  // for checkbox to auto scroll
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const handleAutoScrollChange = () => {
    setIsAutoScroll(!isAutoScroll);
  };

  useEffect(() => {
    dispatch({
      type: 'FETCH_ORDERS',
      payload: { product: product }
    });
    dispatch({ type: 'FETCH_PROFITS' });
  }, [dispatch, product]);


  const clickSettings = () => {
    setShowSettings(!showSettings);
    if (user.admin) {
      dispatch({ type: 'FETCH_USERS' });
    }
  }

  const handleProductChange = (value) => {
    setProduct(value);
    socket.setProduct(value);
  }


  return (
    <div className={`Home ${user.theme}`}>
      {/* {JSON.stringify(socket.product)}
      {JSON.stringify(product)} */}
      <Menu clickSettings={clickSettings} product={product} setProduct={handleProductChange} />


      {
        // on mobile?
        width < 800
          // show mobile page
          // which mobile page?
          ? mobilePage === 'newPair'
            // is the user active
            ? user.active
              ? <Trade setTradeType={setTradeType} tradeType={tradeType} product={product} />
              : <NotActive />
            : mobilePage === 'tradeList'
              // is the user approved
              ? user.approved
                ? <TradeList isAutoScroll={isAutoScroll} product={product} />
                : <NotApproved />
              : mobilePage === 'messages' && <Messages />

          // show all pages
          : <>
            {user.active
              ? <Trade setTradeType={setTradeType} tradeType={tradeType} product={product} />
              : <NotActive />}
            {user.approved
              ? <TradeList isAutoScroll={isAutoScroll} product={product} />
              : <NotApproved />}
            <Messages />
          </>
        // 

      }

      <Status
        product={product}
        isAutoScroll={isAutoScroll}
        handleAutoScrollChange={handleAutoScrollChange}
      />
      <Settings
        product={product}
        showSettings={showSettings}
        clickSettings={clickSettings}
      />
      {width < 800 && <MobileNav setMobilePage={setMobilePage} />}
    </div>
  );
}

export default Home;
