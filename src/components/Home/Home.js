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


function Home(props) {
  const dispatch = useDispatch();
  const [showSettings, setShowSettings] = useState(false);

  const clickSettings = () => {
    setShowSettings(!showSettings);
    if (props.store.accountReducer.userReducer.admin) {
      dispatch({ type: 'FETCH_USERS' })
    }
  }

  return (
    <div className="Home">
      <header className="header">
        <h2>WE USE COINBOT.</h2>
      </header>
      <SocketProvider>
        <Menu clickSettings={clickSettings} />

        {(props.store.accountReducer.userReducer.active)
          ? <Trade />
          : <NotActive />
        }
        {(props.store.accountReducer.userReducer.approved)
          ? <TradeList />
          : <NotApproved />
        }
        <Updates />
        <Status />
        <Settings showSettings={showSettings} clickSettings={clickSettings} />
      </SocketProvider>
    </div>
  );
}

export default connect(mapStoreToProps)(Home);
