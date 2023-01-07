import React from 'react';
import { useData } from '../../contexts/DataContext';
import './Confirm.css';

function Confirm(props) {
  const { user } = useData();

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