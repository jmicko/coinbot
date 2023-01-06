import React, { useEffect, useRef, useState } from 'react';

function Graph(props) {
  const canvasRef = useRef(null);
  const [scaleToZeroX, setScaleToZeroX] = useState(false);
  const [scaleToZeroY, setScaleToZeroY] = useState(false);
  // console.log('graph props', props.setupResults.options.startingValue);
  // console.log('graph props', props.setupResults.options.endingValue);
  // console.log('min size', props.setupResults.options.base_size);
  // console.log('max size', props.setupResults.options.maxSize);
  // console.log('setup options', props.setupResults.options);

  const setupOptions = props.setupResults.options;

  const setupMinSize = props.setupResults.options.base_size;
  const setupMaxSize = props.setupResults.options.maxSize;

  const startingValueX = scaleToZeroX
    ? 0
    : props.setupResults.options.startingValue;
  const endingValue = props.setupResults.options.endingValue;

  // draw a graph using the canvas element
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // const quoteIncrement = Number(props.product.product.quote_increment)

    // clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // make the background white with rgba
    ctx.fillStyle = 'rgba(230, 255, 255, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // get the data and plot the points
    const data = [].concat.apply([], props.data.map(d => d.props.order));

    // check if the data array is empty or contains only null or undefined values
    if (data.length === 0 || data.every(d => !d)) {
      return;
    }

    // get the min and max values
    // const minPrice = Math.min(...data.map(d => d.original_buy_price));
    // const maxPrice = Math.max(...data.map(d => d.original_buy_price));
    const minPrice = startingValueX;
    const maxPrice = endingValue;

    const minSize = scaleToZeroY
      ? 0
      // : Math.min(...data.map(d => d.buy_quote_size));
      : setupMinSize;

    // const maxSize = Math.max(...data.map(d => d.buy_quote_size));
    const maxSize = setupMaxSize;

    // ensure that there will not be infinity
    if (minPrice === maxPrice || minSize === maxSize) {
      return;
    }

    // draw a rectangle inside the canvas with 10% padding in the y direction and 5% padding in the x direction
    // the graph will be drawn inside this rectangle
    const paddingX = canvas.width * 0.1;
    const paddingY = canvas.height * 0.13;
    const graphWidth = canvas.width - 2 * paddingX;
    const graphHeight = canvas.height - 2 * paddingY;

    // draw the rectangle
    ctx.strokeStyle = 'rgba(0, 0, 0, .1)';
    ctx.strokeRect(paddingX, paddingY, graphWidth, graphHeight);

    // draw the x axis in black
    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    ctx.beginPath();
    ctx.moveTo(paddingX, canvas.height - paddingY);
    ctx.lineTo(canvas.width - paddingX, canvas.height - paddingY);
    ctx.stroke();

    // draw the y axis in black
    ctx.beginPath();
    ctx.moveTo(paddingX, paddingY);
    ctx.lineTo(paddingX, canvas.height - paddingY);
    ctx.stroke();

    // draw the x axis label below the x axis, and below the tick labels
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillText('Price', canvas.width / 2, canvas.height - paddingY + 25);


    // draw the y axis labels to the left of the y axis
    ctx.save();
    ctx.translate(paddingX - 5, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Size', 0, -20);
    ctx.restore();

    // draw the x axis ticks
    const numXTicks = 5;
    // tick interval should take padding into account
    const xTickInterval = graphWidth / (numXTicks - 1);
    for (let i = 0; i < numXTicks; i++) {
      // draw the tick
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.beginPath();
      ctx.moveTo(paddingX + i * xTickInterval, canvas.height - paddingY);
      ctx.lineTo(paddingX + i * xTickInterval, canvas.height - paddingY + 5);
      ctx.stroke();

      // draw the tick label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText((minPrice + i * (maxPrice - minPrice) / (numXTicks - 1)).toFixed(2), paddingX + i * xTickInterval, canvas.height - paddingY + 10);


      // draw a light gray graph line
      ctx.strokeStyle = 'rgba(0, 0, 0, .1)';
      ctx.beginPath();
      ctx.moveTo(paddingX + i * xTickInterval, paddingY);
      ctx.lineTo(paddingX + i * xTickInterval, canvas.height - paddingY);
      ctx.stroke();



    }

    // draw the y axis ticks
    const numYTicks = 5;
    // tick interval should take padding into account
    const yTickInterval = graphHeight / (numYTicks - 1);
    for (let i = 0; i < numYTicks; i++) {
      // draw the tick
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.beginPath();
      ctx.moveTo(paddingX, canvas.height - paddingY - i * yTickInterval);
      ctx.lineTo(paddingX - 5, canvas.height - paddingY - i * yTickInterval);
      ctx.stroke();

      // draw the tick label sideways and shifted up
      ctx.save();
      ctx.translate(paddingX - 10, canvas.height - paddingY - i * yTickInterval);
      ctx.rotate(-Math.PI / 2);
      // shift the text up by 10 pixels
      ctx.translate(10, 0);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText((minSize + i * (maxSize - minSize) / (numYTicks - 1)).toFixed(2), 0, 0);
      ctx.restore();

      // draw a light gray graph line
      ctx.strokeStyle = 'rgba(0, 0, 0, .1)';
      ctx.beginPath();
      ctx.moveTo(paddingX, canvas.height - paddingY - i * yTickInterval);
      ctx.lineTo(canvas.width - paddingX, canvas.height - paddingY - i * yTickInterval);
      ctx.stroke();


    }


    // draw a red point for each data point
    ctx.fillStyle = 'rgba(255, 0, 0, 1)';
    data.forEach(d => {

      // each data point will have the following properties:
      // const d = {
      //   base_size: 0.01893265,
      //   buy_quote_size: "20.10",
      //   limit_price: 1061.68,
      //   original_buy_price: 1061.68,
      //   original_sell_price: 1073.36,
      //   previous_total_fees: null,
      //   product_id: "ETH-USD",
      //   sell_quote_size: "20.32",
      //   side: "BUY",
      //   stp: "cn",
      //   total_fees: 0,
      //   trade_pair_ratio: 1.1,
      //   userID: 1,
      // }
      
      // map the original buy price to the x coordinate
      // map the base_size to the y coordinate if setupOptions.sizeType is 'base'
      // map the buy_quote_size to the y coordinate if setupOptions.sizeType is 'quote'
      const whichSize = setupOptions.sizeType === 'base' ? 'base_size' : 'buy_quote_size';
      const x = paddingX + (d.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
      const y = canvas.height - paddingY - (d[whichSize] - minSize) / (maxSize - minSize) * graphHeight;
      
      // draw a thin black curved line to the next point
      if (data.indexOf(d) < data.length - 1) {
        ctx.save();
        ctx.lineWidth = .5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        const nextD = data[data.indexOf(d) + 1];
        const nextX = paddingX + (nextD.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
        const nextY = canvas.height - paddingY - (nextD[whichSize] - minSize) / (maxSize - minSize) * graphHeight;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x, y, nextX, nextY, nextX, nextY);
        ctx.stroke();
        ctx.restore();
      }

      // draw the red point
      ctx.fillStyle = 'rgba(255, 0, 0, 1)';
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
      ctx.fill();



    });









    // the component should rerender when the data changes
  }, [props.data, scaleToZeroX, scaleToZeroY, props.setupResults.options.startingValue, props.setupResults.options.endingValue]);

  return (
    <>
      {/* {JSON.stringify(props.product)} */}
      <h4>{props.title || "Graph"}</h4>
      {/* draw the canvas */}
      <canvas ref={canvasRef}
        width={400} height={300}
      />
      <br />
      {/* {JSON.stringify(scaleToZeroX)} */}
      {/* checkbox for scale to zero */}
      <label>
        <input type="checkbox" checked={scaleToZeroX} onChange={e => setScaleToZeroX(e.target.checked)} />
        Start Price at Zero
      </label>
      <label>
        <input type="checkbox" checked={scaleToZeroY} onChange={e => setScaleToZeroY(e.target.checked)} />
        Start Size at Zero
      </label>
    </>
  )
}

export default Graph;
