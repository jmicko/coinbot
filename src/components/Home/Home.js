import React, { useEffect, useState, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import Trade from '../Trade/Trade.js';
import Messages from '../Messages/Messages.js';
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
import { useSocket } from "../../contexts/SocketProvider";
import useWindowDimensions from '../../hooks/useWindowDimensions.js';

function Home(props) {
  const dispatch = useDispatch();
  const { height, width } = useWindowDimensions();

  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [messagesCount, setMessagesCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const [errorCount, setErrorCount] = useState(0);

  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('original');
  const [mobilePage, setMobilePage] = useState('tradeList');
  const [priceTicker, setPriceTicker] = useState(0);

  const getOpenOrders = useCallback(
    () => {
      dispatch({ type: 'FETCH_ORDERS' });
    }, [dispatch]
  )

  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;
    socket.on('message', message => {
      if ((message.orderUpdate != null) && (message.userID === props.store.accountReducer.userReducer.id)) {
        // do api call for all open orders
        getOpenOrders()
      }
      // console.log('HERE IS THE WHOLE MESSAGE', message);
      if (message.userID === props.store.accountReducer.userReducer.id) {
        // console.log('HERE IS THE USER ID FROM THE MESSAGE', message.userID);
        if (message.message) {
          setMessagesCount(prevMessagesCount => {
            return prevMessagesCount + 1;
          });
          setMessages(prevMessages => {
            // keep max messages down to 3 by checking if more than 2 before adding new message
            if (prevMessages.length > 999) {
              prevMessages.pop();
            }
            let datedMessage = {
              date: `${Date()}`,
              message: `${message.message}`
            }
            return [datedMessage, ...prevMessages]
          });
        }
        if (message.error) {
          setErrorCount(prevErrorCount => {
            return prevErrorCount + 1;
          });
          setErrors(prevErrors => {
            // keep max messages down to 3 by checking if more than 2 before adding new message
            if (prevErrors.length > 999) {
              prevErrors.pop();
            }
            let datedError = {
              date: `${Date()}`,
              error: `${message.error}`
            }
            return [datedError, ...prevErrors]
          });
        }
      }
    });
    // this will remove the listener when component rerenders
    return () => socket.off('message')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket, props.store.accountReducer.userReducer.id, getOpenOrders]);

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
              ? <TradeList priceTicker={priceTicker} theme={theme} />
              : width > 800 && <TradeList priceTicker={priceTicker} theme={theme} />
            : width < 800 && mobilePage === 'tradeList'
              ? <NotApproved theme={theme} />
              : width > 800 && <NotApproved theme={theme} />
        }

        {width < 800 && mobilePage === 'messages'
          ? <Messages theme={theme} messages={messages} messagesCount={messagesCount} errors={errors} errorCount={errorCount} />
          : width > 800 && <Messages theme={theme} messages={messages} messagesCount={messagesCount} errors={errors} errorCount={errorCount} />}

        <Status theme={theme} priceTicker={priceTicker} />
        <Settings showSettings={showSettings} clickSettings={clickSettings} theme={theme} priceTicker={priceTicker} />
        {width < 800 && <MobileNav theme={theme} setMobilePage={setMobilePage} />}
      </SocketProvider>
    </div>
  );
}

export default connect(mapStoreToProps)(Home);
