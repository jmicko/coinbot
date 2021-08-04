import React from 'react';
import { connect } from 'react-redux';
import Trade from '../Trade/Trade.js';
import Updates from '../Messages/Messages.js';
import ToggleBot from '../ToggleBot/ToggleBot'
import TradeList from '../TradeList/TradeList'
import Status from '../Status/Status'
import './Home.css'


function Home(props) {

  return (
    <div className="Home">
      <header className="header">
        <h2>WE USE COINBOT.</h2>
      </header>
      <ToggleBot />
      <Trade />
      <TradeList />
      <Updates />
      <Status />
    </div>
  );
}

export default connect()(Home);
