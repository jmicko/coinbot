import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import Trade from '../Trade/Trade.js';
import Updates from '../Messages/Messages.js';
import ToggleBot from '../ToggleBot/ToggleBot'
import TradeList from '../TradeList/TradeList'
import Status from '../Status/Status'
import Settings from '../Settings/Settings'
import './Home.css'


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
      <ToggleBot clickSettings={clickSettings} />
      <Trade />
      <TradeList />
      <Updates />
      <Status />
      <Settings showSettings={showSettings} />
    </div>
  );
}

export default connect()(Home);
