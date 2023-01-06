import React, { useEffect, useRef } from 'react';

function Graph(props) {
  const canvasRef = useRef(null);
  console.log('graph props', props.setupResults);

  // draw a graph using the canvas element
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const quoteIncrement = Number(props.product.product.quote_increment)

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
    const minPrice = Math.min(...data.map(d => d.original_buy_price));
    const maxPrice = Math.max(...data.map(d => d.original_buy_price));
    const minSize = Math.min(...data.map(d => d.buy_quote_size));
    const maxSize = Math.max(...data.map(d => d.buy_quote_size));

    // ensure that there will not be infinity
    if (minPrice === maxPrice || minSize === maxSize) {
      return;
    }

    // draw a rectangle inside the canvas with 10% padding in the y direction and 5% padding in the x direction
    // the graph will be drawn inside this rectangle
    const paddingX = canvas.width * 0.05;
    const paddingY = canvas.height * 0.1;
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
    ctx.fillText('Price', canvas.width / 2, canvas.height - paddingY + 20);
    

    // draw the y axis labels to the left of the y axis
    ctx.save();
    ctx.translate(paddingX - 5, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Size', 0, 0);
    ctx.restore();

    // draw the x axis ticks
    const numXTicks = 5;
    // tick interval should take padding into account
    const xTickInterval = graphWidth / (numXTicks - 1);
    for (let i = 0; i < numXTicks; i++) {
      // draw the tick
      ctx.beginPath();
      ctx.moveTo(paddingX + i * xTickInterval, canvas.height - paddingY);
      ctx.lineTo(paddingX + i * xTickInterval, canvas.height - paddingY + 5);
      ctx.stroke();

      // draw the tick label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText((minPrice + i * (maxPrice - minPrice) / (numXTicks - 1)).toFixed(2), paddingX + i * xTickInterval, canvas.height - paddingY + 10);
    }















// the component should rerender when the data changes
}, [props.data]);

  return (
    <>
    {/* {JSON.stringify(props.product)} */}
      <h4>{props.title || "Graph"}</h4>
      {/* draw the canvas */}
      <canvas ref={canvasRef}
        width={400} height={300}
      />
    </>
  )
}

export default Graph;
