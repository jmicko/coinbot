import React, { useEffect, useRef } from 'react';
// import { useSelector } from 'react-redux';
import { useSocket } from '../../contexts/SocketProvider';
import './Meter.css'


function Meter(props) {
  const difference = (props.max - props.min).toFixed(0);
  const socket = useSocket();
  const canvasRef = useRef(null);

  // draw a meter bar on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // set the height and width of the meter bar
    const height = 65;
    const width = 8;

    // set the canvas height and width
    canvas.height = height;
    canvas.width = width;

    if (props.max > 0 && props.min >= 0) {

      let adjustedCurrent = socket.tickers[props.product]?.price - props.min;

      // this is the important number
      let percentage = ((adjustedCurrent / difference) * 100).toFixed(0);

      // draw the meter bar
      // the bottom will be green and take up the percentage of the meter bar that is the percentage value
      // the top will be red and take up the top part of the meter bar
      ctx.fillStyle = "rgb(125, 209, 132)";
      ctx.fillRect(0, height - (height * (percentage / 100)), width, height * (percentage / 100));
      ctx.fillStyle = "rgb(167, 119, 92)";
      ctx.fillRect(0, 0, width, height - (height * (percentage / 100)));

    }

  }, [props, socket.tickers, difference])

  return (
    <canvas className="Meter" ref={canvasRef} />
  )
}

export default Meter;