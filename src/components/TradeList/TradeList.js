import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import SingleTrade from '../SingleTrade/SingleTrade'
import './TradeList.css'



// need to set up a listener to listen for messages from the exchange

// when an exchange is made and stored, do a REST call to get all open orders

// orders should be selected as two arrays, one for buys and one for sells. Order buy price, highest at top.

// store arrays in the redux store

// map the sell array on top and buy array on bottom




function TradeList() {
  const dispatch = useDispatch();

  return (
    <div className="TradeList">
      <div className="scrollable boxed">
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <center><p>Robot goes here</p></center>
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

      </div>
    </div>
  )
}

export default TradeList;