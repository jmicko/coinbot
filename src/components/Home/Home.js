import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
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


function Home(props) {
  const [showSettings, setShowSettings] = useState(false);

  const clickSettings = () => {
    setShowSettings(!showSettings);
  }

  return (
    <div className="Home">
      <header className="header">
        <h2>WE USE COINBOT.</h2>
      </header>
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
    </div>
  );
}

export default connect(mapStoreToProps)(Home);
