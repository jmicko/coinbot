import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Menu.css'

function Menu(props) {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer)

  return (

    <div className={`Menu dark ${user.theme}`}>
      <center>
        <p className="greeting">Hello {user.username}!</p>
      </center>
      <div className="menu-buttons">
        {process.env.NODE_ENV === 'development' && user.admin && <button className={`btn-blue btn-logout ${user.theme}`} onClick={() => dispatch({ type: 'TEST' })}>Test</button>}
        <button className={`btn-blue btn-logout ${user.theme}`} onClick={() => { props.clickSettings() }}>Settings</button>
        <button className={`btn-blue btn-logout ${user.theme}`} onClick={() => dispatch({ type: 'LOGOUT' })}>Log Out</button>
      </div>
    </div>

  )
}

export default Menu;