import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './General.css'


function General(props) {
  const dispatch = useDispatch();

  const [max_trade_load, setMaxTradeLoad] = useState(100);


  function pause() {
    dispatch({
      type: 'PAUSE',
    });
  }

  function killLock() {
    dispatch({
      type: 'KILL-LOCK',
    });
  }

  function setTheme(theme) {
    dispatch({
      type: 'SET_THEME',
      payload: {
        theme: theme
      }
    });
  }

  function sendTradeLoadMax(event) {
    dispatch({
      type: 'SET_MAX_TRADE_LOAD',
      payload: {
        max_trade_load: max_trade_load
      }
    });
  }


  return (
    <div className="General">
      <div className="divider" />

      {/* THEME */}
      <h4>Theme</h4>
      <button className="btn-blue medium" onClick={() => { setTheme("original") }}>Original</button>
      <button className={`btn-blue medium darkTheme`} onClick={() => { setTheme("darkTheme") }}>Dark</button>
      <div className="divider" />

      {/* KILL PREVENTION */}

      <h4>Kill Prevention</h4>
      <p>
        Removes the kill button from the trade pairs. This helps prevent accidental deletion of trades. Highly recommended to leave this on.
      </p>
      {props.store.accountReducer.userReducer.kill_locked
        ? <button className={`btn-blue medium ${props.theme}`} onClick={( )=> { killLock() }}>Unlock</button>
        : <button className={`btn-blue medium ${props.theme}`} onClick={() => { killLock() }}>Lock</button>
      }
      <div className="divider" />

      {/* PAUSE */}
      <h4>Pause</h4>
      <p>
        Pauses the bot. Trades will stay in place, but the bot will not check on them or flip them. If they are cancelled on Coinbase, the bot will not notice until it is unpaused.
        Be careful not to trade funds away manually while the bot is paused, or there might be an insufficient funds error.
      </p>
      {props.store.accountReducer.userReducer.paused
        ? <button className={`btn-blue medium ${props.theme}`} onClick={() => { pause() }}>Unpause</button>
        : <button className={`btn-blue medium ${props.theme}`} onClick={() => { pause() }}>Pause</button>
      }
      <div className="divider" />

      {/* MAX TRADES ON SCREEN */}
      <h4>Max Trades on Screen</h4>
      <p>
        Limit the number of trades to load per side (buy/sell). This can make load times shorter and limit the amount of scrolling
        needed to get to the split.
        <br />
        <br />
        Since it is PER SIDE, setting the value to 10 for example would potentially load up to 20 trades total.
        <br />
        <br />
        There is a hard limit of 10,000 open trades per user, so there is no reason to set the value higher than that.
      </p>
      <p>Current max trades to load per side: {Number(props.store.accountReducer.userReducer.max_trade_load)}</p>
      <label htmlFor="reinvest_ratio">
        Set Max:
      </label>
      <input
        type="number"
        name="reinvest_ratio"
        value={max_trade_load}
        required
        onChange={(event) => setMaxTradeLoad(Number(event.target.value))}
      />
      <br />
      <button className={`btn-blue btn-reinvest medium ${props.theme}`} onClick={(event) => { sendTradeLoadMax(event) }}>Save Max</button>
      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(General);