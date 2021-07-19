import React, {
  useState,
  useEffect,
} from 'react';
// import { Link } from 'react-router-dom';
// import { useSelector, useDispatch } from 'react-redux';
import Trade from '../Trade/Trade.js';
import Updates from '../Updates/Updates.js';
// import mapStoreToProps from '../../redux/mapStoreToProps';

// Basic class component structure for React with default state
// value setup. When making a new component be sure to replace
// the component name TemplateClass with the name for the new
// component.
function Home(props) {

  return (
    <div>
      <header className="App-header">
        <h2>Welcome to Coinbot3000</h2>
      </header>
      <Trade />
      {/* TODO - display all orders from database in two categories "buy" & "sell" */}
      <Updates />
    </div>
  );
}

export default Home;
