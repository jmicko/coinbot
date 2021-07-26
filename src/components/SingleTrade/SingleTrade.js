import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import './SingleTrade.css'

function SingleTrade(props) {
  const dispatch = useDispatch();

  return (
    <div className={`${props.side}`}>
      <p>{props.side}~~~~~~~~~~ LIST OF TRADES GOES HERE ~~~~~~~~~~</p>
    </div>
  )
}

export default SingleTrade;