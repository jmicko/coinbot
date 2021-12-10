import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './General.css'


function General(props) {
  const dispatch = useDispatch();
  
  const [reinvest_ratio, setReinvest_ratio] = useState(0);

  // make sure ratio is within percentage range
  useEffect(() => {
    if (reinvest_ratio > 100) {
      setReinvest_ratio(100)
    }
    if (reinvest_ratio < 0) {
      setReinvest_ratio(0)
    }
  }, [reinvest_ratio]);

  function reinvest(event) {
    // event.preventDefault();
    console.log('api details submitted!');
    dispatch({
      type: 'REINVEST',
    });
  }

  function reinvestRatio(event) {
    // event.preventDefault();
    console.log('api details submitted!');
    dispatch({
      type: 'REINVEST_RATIO',
      payload: {
        reinvest_ratio: reinvest_ratio
      }
    });
  }


  return (
    <div className="General">
      <center>
        <p>General Settings Page</p>
      </center>
      <h4>Reinvestment</h4>
        <p>EXPERIMENTAL FEATURE. Coinbot can try to reinvest your profits for you. Be aware that this may not
          work if the profit is too small.
        </p>
        {(props.store.accountReducer.userReducer.reinvest)
          ? <button className="btn-blue" onClick={() => { reinvest() }}>Turn off</button>
          : <button className="btn-blue" onClick={() => { reinvest() }}>Turn on</button>
        }
        {props.store.accountReducer.userReducer.reinvest &&
          <>
            <p>Current reinvestment ratio: {props.store.accountReducer.userReducer.reinvest_ratio}%</p>
            <label htmlFor="reinvest_ratio">
              Set Ratio:
            </label>
            <input
              type="number"
              name="reinvest_ratio"
              value={reinvest_ratio}
              step={10}
              max={100}
              required
              onChange={(event) => setReinvest_ratio(event.target.value)}
            />
            <br />
            <button className="btn-blue" onClick={() => { reinvestRatio() }}>Save reinvestment ratio</button>
          </>
        }
    </div>
  );
}

export default connect(mapStoreToProps)(General);