import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './MobileNav.css'

function MobileNav(props) {
  const dispatch = useDispatch();

  const { height, width } = useWindowDimensions();



  return (

    <div className={`MobileNav dark ${props.store.accountReducer.userReducer.theme}`}>
      <center>
        <p className="greeting">Hello {width}!</p>
      </center>
      <div className="MobileNav-buttons">
        <button className={`btn-blue btn-logout ${props.theme}`} onClick={() => { props.clickSettings() }}>Settings</button>
        <button className={`btn-blue btn-logout ${props.theme}`} onClick={() => dispatch({ type: 'LOGOUT' })}>Log Out</button>
      </div>
    </div>

  )
}

export default connect(mapStoreToProps)(MobileNav);