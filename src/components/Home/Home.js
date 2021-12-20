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


function Home(props) {
  const dispatch = useDispatch();
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('original');
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
      headers: {Accept: 'application/json'}
    };
    
    axios.request(options).then(function (response) {
      // console.log(response.data);
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
        <Menu clickSettings={clickSettings} theme={theme} />

        {(props.store.accountReducer.userReducer.active)
          ? <Trade theme={theme} />
          : <NotActive theme={theme} />
        }
        {(props.store.accountReducer.userReducer.approved)
          ? <TradeList theme={theme} />
          : <NotApproved theme={theme} />
        }
        <Updates theme={theme} />
        <Status theme={theme} priceTicker={priceTicker} />
        <Settings showSettings={showSettings} clickSettings={clickSettings} theme={theme} />
      </SocketProvider>
    </div>
  );
}

export default connect(mapStoreToProps)(Home);
