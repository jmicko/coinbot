import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './General.css'


function General(props) {
  const dispatch = useDispatch();


  function pause(event) {
    // event.preventDefault();
    console.log('Pausing the bot!');
    dispatch({
      type: 'PAUSE',
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
    </div>
  );
}

export default connect(mapStoreToProps)(General);