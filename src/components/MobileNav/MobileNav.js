import React from 'react';
import { useSelector } from 'react-redux';
import './MobileNav.css'

function MobileNav(props) {
  const user = useSelector((store) => store.accountReducer.userReducer);



  return (

    <div className={`MobileNav dark ${user.theme}`}>
      <div className="MobileNav-buttons">
        <button className={`btn-blue btn-nav ${user.theme}`} onClick={() => { props.setMobilePage('tradeList') }}>Trade List</button>
        <button className={`btn-blue btn-nav ${user.theme}`} onClick={() => { props.setMobilePage('newPair') }}>New Pair</button>
        <button className={`btn-blue btn-nav ${user.theme}`} onClick={() => { props.setMobilePage('messages') }}>Messages</button>
      </div>
    </div>

  )
}

export default MobileNav;