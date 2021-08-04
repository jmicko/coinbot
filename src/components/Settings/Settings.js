import React from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Settings.css'


function Home(props) {

  return (
    <div className="Settings">
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
}

export default connect()(Home);
