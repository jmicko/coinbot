import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import SingleTrade from '../SingleTrade/SingleTrade'
import './TradeList.css'

function TradeList() {
  const dispatch = useDispatch();

  return (
    <div className="TradeList boxed tall dark">
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />
      <SingleTrade />

    </div>
  )
}

export default TradeList;