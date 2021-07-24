import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import './TradeList.css'

function TradeList() {
  const dispatch = useDispatch();

  return (
    <div className="TradeList boxed">
      <p className="single-trade">LIST OF TRADES GOES HERE</p>
    </div>
  )
}

export default TradeList;