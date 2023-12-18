import { Dispatch, SetStateAction } from 'react';

import { useUser } from '../../contexts/UserContext.js';
import './MobileNav.css'

function MobileNav(props: { setMobilePage: Dispatch<SetStateAction<string>> }) {
  const { user } = useUser();
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