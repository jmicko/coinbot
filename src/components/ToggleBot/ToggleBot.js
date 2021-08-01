import React from 'react';
import { useDispatch } from 'react-redux';
import './ToggleBot.css'

function ToggleBot() {
  const dispatch = useDispatch();

  return (
    <div className="ToggleBot">
      <button
        className="toggle btn-blue"
        onClick={() => dispatch({ type: 'TOGGLE_BOT' })}>
        TOGGLE BOT
    </button>
    <button className="btn-logout btn-blue" onClick={() => console.log('settings button clicked')}>Settings</button>
    <button className="btn-logout btn-blue" onClick={() => dispatch({ type: 'LOGOUT' })}>Log Out</button>
    </div>
  )
}

export default ToggleBot;