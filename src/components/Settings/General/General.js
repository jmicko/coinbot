import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './General.css'


function General(props) {
  const dispatch = useDispatch();

  const [reinvest_ratio, setReinvest_ratio] = useState(0);
  const [bulk_pair_ratio, setBulk_pair_ratio] = useState(1.1);

  // make sure ratio is within percentage range
  useEffect(() => {
    if (reinvest_ratio > 200) {
      setReinvest_ratio(200)
    }
    if (reinvest_ratio < 0) {
      setReinvest_ratio(0)
    }
  }, [reinvest_ratio]);

  useEffect(() => {
    setReinvest_ratio(props.store.accountReducer.userReducer.reinvest_ratio)
  }, [props.store.accountReducer.userReducer.reinvest_ratio])

  function pause(event) {
    // event.preventDefault();
    console.log('Pausing the bot!');
    dispatch({
      type: 'PAUSE',
    });
  }

  function reinvest(event) {
    // event.preventDefault();
    console.log('reinvest sent!');
    dispatch({
      type: 'REINVEST',
    });
  }

  function reinvestRatio(event) {
    event.preventDefault();
    console.log('reinvest ratio submitted!');
    dispatch({
      type: 'REINVEST_RATIO',
      payload: {
        reinvest_ratio: reinvest_ratio
      }
    });
  }

  function bulkPairRatio(event) {
    event.preventDefault();
    console.log('bulk ratio sent!');
    dispatch({
      type: 'SET_BULK_PAIR_RATIO',
      payload: {
        bulk_pair_ratio: bulk_pair_ratio
      }
    });
  }

  function setTheme(theme) {
    // event.preventDefault();
    console.log('setting the theme!');
    dispatch({
      type: 'SET_THEME',
      payload: {
        theme: theme
      }
    });
  }



  return (
    <div className="General">
      {/* <center>
        <p>General Settings Page</p>
      </center> */}
      <div className="divider" />

      {/* THEME */}
      <h4>Theme</h4>
        <button className="btn-blue medium" onClick={() => { setTheme("original") }}>Original</button>
        <button className={`btn-blue medium darkTheme`} onClick={() => { setTheme("darkTheme") }}>Dark</button>
      <div className="divider" />

      {/* PAUSE */}
      <h4>Pause</h4>
      <p>
        Pauses the bot. Trades will stay in place, but the bot will not check on them or flip them. If they are cancelled on Coinbase, the bot will not notice until it is unpaused.
        Be careful not to trade funds away manually while the bot is paused, or there might be an insufficient funds error.
      </p>
      {(props.store.accountReducer.userReducer.paused)
        ? <button className={`btn-blue medium ${props.theme}`} onClick={() => { pause() }}>Unpause</button>
        : <button className={`btn-blue medium ${props.theme}`} onClick={() => { pause() }}>Pause</button>
      }
      <div className="divider" />

      {/* REINVEST */}
      <h4>Reinvestment</h4>
      <p>Coinbot can try to reinvest your profits for you. Be aware that this may not
        work if the profit is too small.
      </p>
      {(props.store.accountReducer.userReducer.reinvest)
        ? <button className={`btn-blue medium ${props.theme}`} onClick={() => { reinvest() }}>Turn off</button>
        : <button className={`btn-blue medium ${props.theme}`} onClick={() => { reinvest() }}>Turn on</button>
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
            max={200}
            required
            onChange={(event) => setReinvest_ratio(event.target.value)}
          />
          <br />
          <button className={`btn-blue btn-reinvest medium ${props.theme}`} onClick={(event) => { reinvestRatio(event) }}>Save reinvestment ratio</button>
          <div className="divider" />
        </>
      }

      {/* BULK PERCENTAGE CHANGE */}
      <h4>Bulk Percentage Change</h4>
      <p>
        EXPERIMENTAL FEATURE. This will change the trade pair ratio for ALL trades to a uniform percentage. This can be useful for when your fees change due to trade volume and you want to change the ratio accordingly.
      </p>
        <>
          <label htmlFor="bulk_pair_ratio">
            New Ratio:
          </label>
          <input
            type="number"
            name="bulk_pair_ratio"
            value={bulk_pair_ratio}
            step={.1}
            max={100}
            min={0}
            required
            onChange={(event) => setBulk_pair_ratio(Number(event.target.value))}
          />
          <br />
          <button className={`btn-blue btn-bulk-pair-ratio medium ${props.theme}`} onClick={(event) => { bulkPairRatio(event) }}>Set all trades to new ratio</button>
          <div className="divider" />
        </>
      
    </div>
  );
}

export default connect(mapStoreToProps)(General);