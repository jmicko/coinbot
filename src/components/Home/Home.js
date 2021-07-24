import React, {
  useState,
  useEffect,
} from 'react';
// import { Link } from 'react-router-dom';
// import { useSelector, useDispatch } from 'react-redux';
import Trade from '../Trade/Trade.js';
import Updates from '../Updates/Updates.js';
import ToggleBot from '../ToggleBot/ToggleBot'
import TradeList from '../TradeList/TradeList'
import Status from '../Status/Status'
import './Home.css'
// import mapStoreToProps from '../../redux/mapStoreToProps';

// Basic class component structure for React with default state
// value setup. When making a new component be sure to replace
// the component name TemplateClass with the name for the new
// component.
function Home(props) {

  return (
    <div className="Home">
      <header className="header">
        <h2>Welcome to Coinbot3000</h2>
      </header>
      <ToggleBot />
      <Trade />
      {/* TODO - display all orders from database in two categories "buy" & "sell" */}
      <TradeList />
      <Updates />
      <Status />
    </div>
  );
}

export default Home;
