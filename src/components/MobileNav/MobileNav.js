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
        <div className="MobileNav-buttons">
          <button className={`btn-blue btn-nav ${props.theme}`} onClick={() => { props.setMobilePage('tradeList') }}>Trade List</button>
          <button className={`btn-blue btn-nav ${props.theme}`} onClick={() => { props.setMobilePage('newPair') }}>New Pair</button>
          <button className={`btn-blue btn-nav ${props.theme}`} onClick={() => { props.setMobilePage('messages') }}>Messages</button>
        </div>
    </div>

  )
}

export default connect(mapStoreToProps)(MobileNav);