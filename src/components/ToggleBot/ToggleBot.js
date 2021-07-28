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
    </div>
  )
}

export default ToggleBot;