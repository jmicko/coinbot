import { Dispatch, SetStateAction } from 'react';

import './MobileNav.css'
import { useUser } from '../../hooks/useUser';
function MobileNav(props: { setMobilePage: Dispatch<SetStateAction<string>>, mobilePage: string }) {
  const { user } = useUser();
  return (
    <div className={`MobileNav ${user.theme}`}>
      {/* <div className="MobileNav-buttons"> */}
      <button
        className={`btn-nav ${user.theme} ${props.mobilePage === 'tradeList' && 'selected'}`}
        onClick={() => { props.setMobilePage('tradeList') }}
      >Trade List</button>
      <button
        className={`btn-nav ${user.theme} ${props.mobilePage === 'newPair' && 'selected'}`}
        onClick={() => { props.setMobilePage('newPair') }}
      >{user.active ? 'New' : 'API'}</button>
      <button
        className={`btn-nav ${user.theme} ${props.mobilePage === 'messages' && 'selected'}`}
        onClick={() => { props.setMobilePage('messages') }}
      >Messages</button>
      {/* </div> */}
    </div>
  )
}

export default MobileNav;