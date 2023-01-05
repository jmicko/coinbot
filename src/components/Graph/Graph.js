import React, { useEffect, useRef } from 'react';

function Graph(props) {
  const canvasRef = useRef(null);

  // draw a graph using the canvas element
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    console.log(ctx);

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
    const xScale = canvas.width / (maxPrice - minPrice);
    const yScale = canvas.height / (maxSize - minSize);

    // // add some padding to the minimum and maximum values
    const padding = 0.1;
    const minPriceScaled = minPrice - (maxPrice - minPrice) * padding;
    const maxPriceScaled = maxPrice + (maxPrice - minPrice) * padding;
    const minSizeScaled = minSize - (maxSize - minSize) * padding;
    const maxSizeScaled = maxSize + (maxSize - minSize) * padding;

    // draw the x and y axis
    ctx.beginPath();
    ctx.moveTo((0 - minSizeScaled) * yScale, (0 - minPriceScaled) * xScale);
    ctx.lineTo((0 - minSizeScaled) * yScale, (maxPriceScaled - minPriceScaled) * xScale);
    ctx.lineTo((maxSizeScaled - minSizeScaled) * yScale, (maxPriceScaled - minPriceScaled) * xScale);
    ctx.stroke();

    // draw the x and y axis labels
    ctx.fillText(
      "Size",
      (0 - minSizeScaled) * yScale - 20,
      (maxPriceScaled - minPriceScaled) * xScale / 2
    );
    ctx.fillText(
      "Price",
      (maxSizeScaled - minSizeScaled) * yScale / 2,
      (maxPriceScaled - minPriceScaled) * xScale + 20
    );


    // // plot the data points
    ctx.beginPath();
    ctx.moveTo((data[0].original_buy_price - minPrice) * xScale, canvas.height - (data[0].buy_quote_size - minSize) * yScale);
    for (let i = 1; i < data.length; i++) {
      const x = (data[i].original_buy_price - minPrice) * xScale;
      const y = canvas.height - (data[i].buy_quote_size - minSize) * yScale;

      ctx.lineTo(x, y);
    }
    ctx.stroke();

    

  }, [props.data]);

  return (
    <>
      <h4>{props.title || "Graph"}</h4>
      {/* draw the canvas */}
      <canvas ref={canvasRef}
      // width={400} height={200}
      />
    </>
  )
}

export default Graph;
