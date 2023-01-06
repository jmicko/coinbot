import React, { useEffect, useRef } from 'react';

function Graph(props) {
  const canvasRef = useRef(null);

  // draw a graph using the canvas element
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // get the data and plot the points
    const data = [].concat.apply([], props.data.map(d => d.props.order));

    // check if the data array is empty or contains only null or undefined values
    if (data.length === 0 || data.every(d => !d)) {
      return;
    }

    // scale the data to fit the canvas
    const minPrice = Math.min(...data.map(d => d.original_buy_price));
    const maxPrice = Math.max(...data.map(d => d.original_buy_price));
    const minSize = Math.min(...data.map(d => d.buy_quote_size));
    const maxSize = Math.max(...data.map(d => d.buy_quote_size));
    // ensure that xScale and yScale will not be infinity
    if (minPrice === maxPrice || minSize === maxSize) {
      return;
    }
    const xScale = canvas.width / (maxPrice - minPrice);
    const yScale = canvas.height / (maxSize - minSize);

    // console.log(canvas.width, canvas.height, 'canvas.width, canvas.height')

    // console.log(minPrice, maxPrice, minSize, maxSize, 'minPrice, maxPrice, minSize, maxSize');
    // console.log(xScale, yScale, 'xScale, yScale');

    // add 10% padding to the minimum and maximum values
    const padding = 0.1;
    const minPriceScaled = minPrice - xScale * padding;
    const maxPriceScaled = maxPrice + xScale * padding;
    const minSizeScaled = minSize - yScale * padding;
    const maxSizeScaled = maxSize + yScale * padding;

    // console.log(minPriceScaled, maxPriceScaled, minSizeScaled, maxSizeScaled, 'minPriceScaled, maxPriceScaled, minSizeScaled, maxSizeScaled');

    // make the background white with rgba
    ctx.fillStyle = 'rgba(230, 255, 255, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    // set the style for the grid lines a dark grey using rgba
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = .5;

    // draw the vertical grid lines
    // there should be 10 vertical grid lines. the width of the line is the width of the canvas divided by 10
    // they should  be drawn within the padding values (10%)
    for (let i = minPriceScaled; i <= maxPriceScaled; i += (maxPriceScaled - minPriceScaled) / 10) {
      ctx.beginPath();
      ctx.moveTo((i - minPrice) * xScale, 0);
      ctx.lineTo((i - minPrice) * xScale, canvas.height);
      ctx.stroke();
    }

    // draw the horizontal grid lines
    // there should be 5 horizontal grid lines. the height of the line is the height of the canvas divided by 5
    // they should be drawn within the padding values (10%)
    for (let i = minSizeScaled; i <= maxSizeScaled; i += (maxSizeScaled - minSizeScaled) / 5) {
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - (i - minSize) * yScale);
      ctx.lineTo(canvas.width, canvas.height - (i - minSize) * yScale);
      ctx.stroke();
    }


    // draw the x and y axis, within the padding
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - (minSizeScaled - minSize) * yScale);
    ctx.lineTo(canvas.width, canvas.height - (minSizeScaled - minSize) * yScale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo((minPriceScaled - minPrice) * xScale, 0);
    ctx.lineTo((minPriceScaled - minPrice) * xScale, canvas.height);
    ctx.stroke();

    // draw the x and y axis labels
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText('Price', canvas.width / 2, canvas.height - 20);
    ctx.save();
    ctx.translate(10, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Size', 0, 0);
    ctx.restore();

    // label the grid lines
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // draw the vertical grid line labels, which are the price values
    // only label every other line
    for (let i = minPrice; i <= maxPrice; i += ((maxPrice - minPrice) / 10) * 2) {
      ctx.fillText(i.toFixed(2), (i - minPrice) * xScale, canvas.height - 10);
    }
    // draw the horizontal grid line labels, which are the size values
    for (let i = minSize; i <= maxSize; i += (maxSize - minSize) / 5) {
      ctx.fillText(i.toFixed(2), 20, canvas.height - (i - minSize) * yScale);
    }

    // // plot the data points
    ctx.fillStyle = 'red';
    data.forEach(d => {
      ctx.beginPath();
      ctx.arc((d.original_buy_price - minPrice) * xScale, canvas.height - (d.buy_quote_size - minSize) * yScale, 1, 0, 2 * Math.PI);
      ctx.fill();
    });


  }, [props.data]);

  return (
    <>
      <h4>{props.title || "Graph"}</h4>
      {/* draw the canvas */}
      <canvas ref={canvasRef}
        width={400} height={200}
      />
    </>
  )
}

export default Graph;