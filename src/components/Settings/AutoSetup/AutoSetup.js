import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './AutoSetup.css'


function AutoSetup(props) {
  const dispatch = useDispatch();

  const [startingValue, setStartingValue] = useState(1000);
  const [increment, setIncrement] = useState(100);
  const [size, setSize] = useState(10);


  function submitAutoSetup(event) {
    event.preventDefault();
    console.log('automatically setting up bot');
  }

  return (
    <div className="AutoSetup">
      <div className="divider" />
      <h4>Auto Setup</h4>
      <p>
        Enter the parameters you want and the bot will keep placing trades for you based on those parameters until you run out of cash.
        This is much easier than manually placing dozens of trades if they are following a basic pattern.
      </p>

      <form className='auto-setup-form' onSubmit={submitAutoSetup}>

        {/* STARTING VALUE */}
        <p>What dollar amount to start at?</p>
        <label htmlFor='startingValue'>
          Starting Value
        </label>
        <input
          name='startingValue'
          type='number'
          value={startingValue}
          required
          onChange={(event) => setStartingValue(event.target.value)}
        />

        {/* INCREMENT */}
        <p>What dollar amount to increment by?</p>
        <label htmlFor='increment'>
          Increment
        </label>
        <input
          name='increment'
          type='number'
          value={increment}
          required
          onChange={(event) => setIncrement(event.target.value)}
        />

        {/* SIZE */}
        <p>What size in USD should each trade-pair be?</p>
        <label htmlFor='size'>
          Size in USD
        </label>
        <input
          name='size'
          type='number'
          value={size}
          required
          onChange={(event) => setSize(event.target.value)}
        />
        {/* SUBMIT */}
        <br />
        <br />
        <input className={`btn-store-api btn-blue medium ${props.theme}`} type="submit" name="submit" value="Start Trading" />
      </form>

      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(AutoSetup);