import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import Trade from '../Trade/Trade.js';
import Updates from '../Messages/Messages.js';
import Menu from '../Menu/Menu'
import TradeList from '../TradeList/TradeList'
import Status from '../Status/Status'
import Settings from '../Settings/Settings'
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Home.css'
import NotApproved from '../NotApproved/NotApproved.js';
import NotActive from '../NotActive/NotActive.js';
import { SocketProvider } from '../../contexts/SocketProvider.js';
import axios from 'axios';
import MobileNav from '../MobileNav/MobileNav.js';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';

function Home(props) {
  const dispatch = useDispatch();
  const { height, width } = useWindowDimensions();

  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('original');
  const [mobilePage, setMobilePage] = useState('tradeList');
  const [priceTicker, setPriceTicker] = useState(0);

  const clickSettings = () => {
    setShowSettings(!showSettings);
    if (props.store.accountReducer.userReducer.admin) {
      dispatch({ type: 'FETCH_USERS' });
    }
  }

  useEffect(() => {
    if (props.store.accountReducer.userReducer.theme) {
      setTheme(props.store.accountReducer.userReducer.theme);
    }
  }, [props.store.accountReducer.userReducer.theme])

  // to get price of bitcoin updated on dom
  function ticker(data) {
    const options = {
      method: 'GET',
      url: 'https://api.exchange.coinbase.com/products/BTC-USD/ticker',
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
      ticker();
    }, 1000);
    // need to clear on return or it will make dozens of calls per second
    return () => clearInterval(interval);
  }, []);


  return (
    <div className={`Home ${theme}`}>
      {/* <header className="header">
        <h2>WE USE COINBOT.</h2>
      </header> */}
      <SocketProvider>
        {/* <p>{mobilePage}</p> */}
        <Menu clickSettings={clickSettings} theme={theme} />
        {/* <p>{JSON.stringify(props.store.accountReducer.userReducer)}</p> */}

        {
          props.store.accountReducer.userReducer.active
            ? width < 800 && mobilePage === 'newPair'
              ? <Trade theme={theme} priceTicker={priceTicker} />
              : width > 800 && <Trade theme={theme} priceTicker={priceTicker} />
            : width < 800 && mobilePage === 'newPair'
              ? <NotActive theme={theme} />
              : width > 800 && <NotActive theme={theme} />
        }

        {
          props.store.accountReducer.userReducer.approved
            ? width < 800 && mobilePage === 'tradeList'
              ? <TradeList theme={theme} />
              : width > 800 && <TradeList theme={theme} />
            : width < 800 && mobilePage === 'tradeList'
              ? <NotApproved theme={theme} />
              : width > 800 && <NotApproved theme={theme} />
        }

        {width < 800 && mobilePage === 'messages'
              ? <Updates theme={theme} />
              : width > 800 && <Updates theme={theme} />}
        
        <Status theme={theme} priceTicker={priceTicker} />
        <Settings showSettings={showSettings} clickSettings={clickSettings} theme={theme} priceTicker={priceTicker} />
        {width < 800 && <MobileNav theme={theme} setMobilePage={setMobilePage} />}
      </SocketProvider>
    </div>
  );
}

export default connect(mapStoreToProps)(Home);
