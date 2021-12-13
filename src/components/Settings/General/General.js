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
      <p>EXPERIMENTAL FEATURE. Coinbot can try to reinvest your profits for you. Be aware that this may not
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
            max={100}
            required
            onChange={(event) => setReinvest_ratio(event.target.value)}
          />
          <br />
          <button className={`btn-blue btn-reinvest medium ${props.theme}`} onClick={() => { reinvestRatio() }}>Save reinvestment ratio</button>
          <div className="divider" />
        </>
      }
    </div>
  );
}

export default connect(mapStoreToProps)(General);