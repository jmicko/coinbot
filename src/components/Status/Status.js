import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import './Status.css'

function Status() {
  const dispatch = useDispatch();

  return (
    <div className="Status boxed">
        <h3 className="title">
        Status
        </h3>
      <p className="info">status feature coming</p>
    </div>
  )
}

export default Status;