import React from 'react';
import { connect, useDispatch } from 'react-redux';
import './ToggleBot.css'

function ToggleBot(props) {
  const dispatch = useDispatch();

  return (
    <div className="ToggleBot">
    <button className="btn-logout btn-blue" onClick={() => {props.clickSettings()}}>Settings</button>
    <button className="btn-logout btn-blue" onClick={() => dispatch({ type: 'SYNC_ORDERS' })}>Sync All Trades</button>
    <button className="btn-logout btn-blue" onClick={() => dispatch({ type: 'LOGOUT' })}>Log Out</button>
    </div>
  )
}

export default connect()(ToggleBot);