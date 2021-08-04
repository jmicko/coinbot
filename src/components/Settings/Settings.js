import React from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Settings.css'


function Home(props) {
  if (props.showSettings) {

    return (
      <div className="Settings">
        <>{JSON.stringify(props)}</>
        <p>Some settings or whatever</p>
        <p>Some settings or whatever</p>
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
