import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Status.css'
import { useSocket } from "../../contexts/SocketProvider";



function Status(props) {
  const dispatch = useDispatch();
  const [loopStatus, setLoopStatus] = useState("I count loops");
  const [connection, setConnection] = useState("disconnected");

  const socket = useSocket();

  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;


    socket.on('update', update => {
      // loop status updates get saved to own state
      if (update.loopStatus != null) {
        setLoopStatus(update.loopStatus)
      }
      // connection status updates get saved to own state
      if (update.connection != null) {
        setConnection(update.connection)
        // console.log(`message:`, message.loopStatus);
      }
    });

    // this will remove the listener when component rerenders
    return () => socket.off('update')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket])

  return (

    <div className="Status boxed">
      <h3 className="title">
        Status
      </h3>
      {/* todo - maybe style in some divider lines here or something */}
      <p className="info"><strong>~~~ Coinbot ~~~</strong></p>
      <p className="info">{connection}</p>
      <p className="info"><strong>~~~ The Loop ~~~</strong></p>
      <p className="info">{loopStatus}</p>
      <p className="info"><strong>~~~ Account ~~~</strong></p>
      <p className="info"><strong>Maker Fee</strong><br />{props.store.accountReducer.feeReducer.maker_fee_rate * 100}%</p>
      <p className="info"><strong>Taker Fee</strong><br />{props.store.accountReducer.feeReducer.taker_fee_rate * 100}%</p>
      <p className="info"><strong>30 Day Volume</strong><br />${props.store.accountReducer.feeReducer.usd_volume}</p>
      {/* .store.accountReducer.feeReducer */}
    </div>
  )
}

export default connect(mapStoreToProps)(Status);