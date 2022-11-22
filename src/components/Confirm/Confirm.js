import React from 'react';
import { useSelector } from 'react-redux';
import './Confirm.css';

function Confirm(props) {
  const user = useSelector((store) => store.accountReducer.userReducer);

  return (
    <div className={`Confirm`}>
      <center>
        <p>Are you sure?</p>
        <button className={`btn-green medium ${user.theme}`} onClick={props.execute}>Confirm</button>
        <button className={`btn-red medium ${user.theme}`} onClick={props.ignore}>Cancel</button>
      </center>
    </div>
  )
}

export default Confirm;