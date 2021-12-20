import React from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './NotActive.css';


function NotActive(props) {

  return (
    <div className="NotActive" >
      <div className="scrollable boxed">
        <h3 className={`title ${props.theme}`}>You are not active!</h3>
        <center><p>You must store your API details from Coinbase Pro before you can trade. 
          You can do this in the settings.</p></center>

      </div>
      {/* <div className="spacer" > jgdsf</div> */}
    </div>
  );
}


export default connect(mapStoreToProps)(NotActive);
