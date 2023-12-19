import { useEffect, useRef } from 'react';
import './Meter.css'
import { useData } from '../../contexts/DataContext';
import { useWebSocket } from '../../contexts/useWebsocket';

interface MeterProps {
  min: number;
  max: number;
}

function Meter(props: MeterProps) {
  const { tickers } = useWebSocket();
  const { productID, pd } = useData();
  const difference = Number((props.max - props.min).toFixed(pd));
  const canvasRef = useRef(null);
  const currentPrice = tickers[productID]?.price;
  const canDraw = props.max > 0 && props.min >= 0 && difference > 0 && currentPrice
  // draw a meter bar on the canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas: HTMLCanvasElement = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    // set the height and width of the meter bar
    const height = 65;
    const width = 8;
    // set the canvas height and width
    canvas.height = height;
    canvas.width = width;

    if (props.max > 0 && props.min >= 0 && difference > 0 && currentPrice) {
      let adjustedCurrent = currentPrice - props.min;
      // this is the important number
      const percentage = Number(((adjustedCurrent / difference) * 100).toFixed(0));
      const greenY = height - (height * (percentage / 100));
      const greenHeight = height * (percentage / 100);

      // draw the meter bar
      // the bottom will be green and take up the percentage of the meter bar 
      // that is the percentage value.
      // the top will be red and take up the top part of the meter bar
      ctx.fillStyle = "rgb(125, 209, 132)";
      ctx.fillRect(0, greenY, width, height * (percentage / 100));
      ctx.fillStyle = "rgb(167, 119, 92)";
      ctx.fillRect(0, 0, width, height - greenHeight);
    }
  }, [props, currentPrice, difference])

  // const MeterElement = () => {
  //   return (
  //     <canvas className="Meter" ref={canvasRef} />
  //   )
  // }

  // const BrokenMeter = () => {
  //   console.log('cannot draw');

  //   return (
  //     <p>
  //       Somethin'<br />
  //       ain't<br />
  //       right<br />
  //       here,<br />
  //       boss
  //     </p>
  //   )
  // }
  return (
    <>
      <canvas className={`Meter ${!canDraw && 'hidden'}`} ref={canvasRef} />
      <p className={`${canDraw && 'hidden'}`}>
        Somethin'<br />
        ain't<br />
        right<br />
        here,<br />
        boss
      </p>
    </>
  )
  // if (canDraw) return <MeterElement />
  // else return <BrokenMeter />
}

export default Meter;