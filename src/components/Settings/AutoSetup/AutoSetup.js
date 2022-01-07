import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './AutoSetup.css'


function AutoSetup(props) {
  const dispatch = useDispatch();

  const [startingValue, setStartingValue] = useState(1000);


  function submitAutoSetup(event) {
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
      </form>

      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(AutoSetup);