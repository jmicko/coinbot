import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import './SingleTrade.css'

function SingleTrade() {
  const dispatch = useDispatch();

  return (
    <div className="SingleTrade">
      <p className="trade">~~~~~~~~~~ LIST OF TRADES GOES HERE ~~~~~~~~~~</p>
    </div>
  )
}

export default SingleTrade;