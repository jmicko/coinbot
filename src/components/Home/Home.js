import React, { useEffect, useState, useCallback } from 'react';
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
import axios from 'axios';
import MobileNav from '../MobileNav/MobileNav.js';
import { useSocket } from "../../contexts/SocketProvider";
import { useTickerSocket } from "../../contexts/TickerProvider";
import useWindowDimensions from '../../hooks/useWindowDimensions.js';

function Home() {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const { height, width } = useWindowDimensions();

  const socket = useSocket();
  const ticker = useTickerSocket();

  const [showSettings, setShowSettings] = useState(false);
  // const [theme, setTheme] = useState('original');
  const [mobilePage, setMobilePage] = useState('tradeList');
  const [tradeType, setTradeType] = useState('pair');
  const [priceTicker, setPriceTicker] = useState(0);

  // for checkbox to auto scroll
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const handleAutoScrollChange = () => {
    setIsAutoScroll(!isAutoScroll);
  };

  useEffect(() => {
    dispatch({ type: 'FETCH_ORDERS' });
  }, [dispatch]);

  const updateUser = () => {
    dispatch({ type: 'FETCH_PROFITS' });
    dispatch({ type: 'FETCH_ACCOUNT' });
    dispatch({ type: 'FETCH_ORDERS' });
    dispatch({ type: 'FETCH_USER' });
  }

  // choose between real or sandbox websocket price ticker
  useEffect(() => {
    if (user.sandbox) {
      setPriceTicker(ticker.sandboxTicker)
    } else {
      setPriceTicker(ticker.ticker)
    }
  }, [ticker])

  const clickSettings = () => {
    setShowSettings(!showSettings);
    if (user.admin) {
      dispatch({ type: 'FETCH_USERS' });
    }
  }

  // todo - get rid of this when more confident in websocket ticker.
  // might be nice to find a way to use this if the websocket ever fails
  // to get price of bitcoin updated on dom
  function timedTicker() {

    let URI = 'https://api.exchange.coinbase.com/products/BTC-USD/ticker';
    if (user.sandbox) {
      URI = 'https://api-public.sandbox.exchange.coinbase.com/products/BTC-USD/ticker';
    }

    const options = {
      method: 'GET',
      url: URI,
      headers: { Accept: 'application/json' }
    };

    axios.request(options).then(function (response) {
      setPriceTicker(response.data.price)
    }).catch(function (error) {
      console.error(error);
    });
  }

  // calls the ticker at regular intervals
  useEffect(() => {
    const interval = setInterval(() => {
      timedTicker();
    }, 2000);
    // need to clear on return or it will make dozens of calls per second
    return () => clearInterval(interval);
  }, []);


  return (
    <div className={`Home ${user.theme}`}>
      <Menu clickSettings={clickSettings} />
      {
        user.active
          ? width < 800 && mobilePage === 'newPair'
            ? <Trade priceTicker={priceTicker} setTradeType={setTradeType} tradeType={tradeType} />
            : width > 800 && <Trade priceTicker={priceTicker} setTradeType={setTradeType} tradeType={tradeType} />
          : width < 800 && mobilePage === 'newPair'
            ? <NotActive />
            : width > 800 && <NotActive />
      }

      {
        user.approved
          ? width < 800 && mobilePage === 'tradeList'
            ? <TradeList isAutoScroll={isAutoScroll} priceTicker={priceTicker} />
            : width > 800 && <TradeList isAutoScroll={isAutoScroll} priceTicker={priceTicker} />
          : width < 800 && mobilePage === 'tradeList'
            ? <NotApproved />
            : width > 800 && <NotApproved />
      }

      {width < 800 && mobilePage === 'messages'
        ? <Messages />
        : width > 800 && <Messages />}

      <Status
        priceTicker={priceTicker}
        isAutoScroll={isAutoScroll}
        handleAutoScrollChange={handleAutoScrollChange}
        updateUser={updateUser}
      />
      <Settings
        showSettings={showSettings}
        clickSettings={clickSettings}
        priceTicker={priceTicker}
      />
      {width < 800 && <MobileNav setMobilePage={setMobilePage} />}
    </div>
  );
}

export default Home;
