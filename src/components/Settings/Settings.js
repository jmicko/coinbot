import React from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Settings.css'


function Home(props) {
  if (props.showSettings) {

    return (
      <div className="Settings">
        {/* <>{JSON.stringify(props)}</> */}
        <h2 className="settings-header">Settings</h2>
        <h4>Connection Method</h4>
        <p>
          REST is slower but more reliable. Websocket is faster and better for hundreds of open orders
          placed very close together, but is less reliable on bad
          internet connections. With Websocket, dropped messages are not recovered, and you should
          occasionally switch to REST to synchronize.
        </p>
        <button className="btn-blue">REST</button>
        <button className="btn-blue">Websocket</button>
        <p>Some settings or whatever</p>
        <p>Some settings or whatever</p>
        <p>Some settings or whatever</p>
        <p>Some settings or whatever</p>
        <p>Some settings or whatever</p>
        <p>Some settings or whatever</p>
      </div>
    );
  } else {
    return (
      <></>
    );
  }
}

export default connect()(Home);
