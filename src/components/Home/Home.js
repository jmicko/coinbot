import React from 'react';
// import { Link } from 'react-router-dom';
// import { useSelector, useDispatch } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import Trade from '../Trade/Trade.js';
import Updates from '../Updates/Messages.js';
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

  const dispatch = useDispatch();

  const logout = () => {
    console.log('logout button clicked');
    dispatch({ type: 'LOGOUT' })
  }
  
  return (
    <div className="Home">
      <> {JSON.stringify(props.store.accountReducer)} </>
      <header className="header">
        <h2>WE USE COINBOT.</h2>
        <button onClick={logout}>Log Out</button>
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

export default connect(mapStoreToProps)(Home);
