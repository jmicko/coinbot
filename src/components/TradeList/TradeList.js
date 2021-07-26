import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import SingleTrade from '../SingleTrade/SingleTrade'
import './TradeList.css'

function TradeList() {
  const dispatch = useDispatch();

  return (
    <div className="TradeList">
      <div className="scrollable boxed">
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <center><p>Robot goes here</p></center>
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />

      </div>
    </div>
  )
}

export default TradeList;