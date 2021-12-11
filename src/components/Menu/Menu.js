import React from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Menu.css'

function Menu(props) {
  const dispatch = useDispatch();

  return (

    <div className={`Menu dark ${props.store.accountReducer.userReducer.theme}`}>
      <center>
        <p className="greeting">Hello {props.store.accountReducer.userReducer.username}!</p>
      </center>
      <div className="menu-buttons">
        <button className={`btn-blue btn-logout ${props.theme}`} onClick={() => { props.clickSettings() }}>Settings</button>
        <button className={`btn-blue btn-logout ${props.theme}`} onClick={() => dispatch({ type: 'LOGOUT' })}>Log Out</button>
      </div>
    </div>

  )
}

export default connect(mapStoreToProps)(Menu);