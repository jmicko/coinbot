import React from 'react';
import { connect, useDispatch } from 'react-redux';
import './Menu.css'

function Menu(props) {
  const dispatch = useDispatch();

  return (
    <div className="Menu">
    <button className="btn-logout btn-blue" onClick={() => {props.clickSettings()}}>Settings</button>
    <button className="btn-logout btn-blue" onClick={() => dispatch({ type: 'LOGOUT' })}>Log Out</button>
    </div>
  )
}

export default connect()(Menu);