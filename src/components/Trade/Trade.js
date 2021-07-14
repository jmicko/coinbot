import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { connect, useSelector, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';

// Basic class component structure for React with default state
// value setup. When making a new component be sure to replace
// the component name TemplateClass with the name for the new
// component.
function Trade (props) {

  const [heading, setHeading] = useState('Trade Component');
  // have this be the default value of whatever 0.001 worth of bitcoin is
  // will need a function to poll the current value every 5 seconds from CB api
  const [transactionPrice, setTransactionPrice] = useState(''); 
  const [transactionAmount, setTransactionAmount] = useState('0.001');

  
    return (
      <div>
        <h2>{heading}</h2>
        <p>
          {JSON.stringify(props)}
        </p>
        <Link to="/">
          home
        </Link>

        <div>
          {/* <form onSubmit={submitTransaction} >
            
          </form> */}
        </div>
      </div>
    );
  
}


export default connect(mapStoreToProps)(Trade);
