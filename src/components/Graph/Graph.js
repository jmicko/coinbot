import React, { useCallback, useEffect, useRef, useState } from 'react';

function Graph(props) {
  const canvasRef = useRef(null);
  const [scaleToZeroX, setScaleToZeroX] = useState(false);
  const [scaleToZeroY, setScaleToZeroY] = useState(true);
  const [showSells, setShowSells] = useState(false);
  const [showCurrentPrice, setShowCurrentPrice] = useState(true);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const setupOptions = props.setupResults.options;

  console.log(setupOptions, 'props.setupResults in Graph.js');

  const setupMinSize = setupOptions.size;
  const maxSize = setupOptions.sizeCurve === 'curve'
    ? setupOptions.maxSize
    : setupMinSize * 2;
  const currentPrice = Number(setupOptions.tradingPrice);

  const whichSize = setupOptions.sizeType === 'base' ? 'base_size' : 'buy_quote_size';

  const startingValueX = scaleToZeroX ? 0 : setupOptions.startingValue;
  const endingValue = setupOptions.endingValue;

  const minSize = scaleToZeroY ? 0 : setupMinSize;
  // const maxSize = setupMaxSize;

  // get the min and max values
  const minPrice = startingValueX;
  const maxPrice = endingValue;

  // capture the mouse position
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    // get bounding client rect will give us the position of the canvas on the page
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMouse({ x, y });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    // add the mouse move listener
    canvas.addEventListener('mousemove', handleMouseMove);

    // remove the event listener when the component unmounts
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  // console.log(props.data, 'props.data in Graph.js')

  // get the data
  // const data = [].concat.apply([], props.data.map(d => d));
  const data = props.data;

  // draw a boundary around the graph
  const drawGraphBoundary = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');
    const { paddingX, paddingY, graphWidth, graphHeight } = getGraphDimensions(canvas);

    // draw the rectangle
    ctx.strokeStyle = 'rgba(0, 0, 0, .1)';
    ctx.strokeRect(paddingX, paddingY, graphWidth, graphHeight);
  }, []);

  const drawPriceTicker = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');
    const { graphWidth, paddingX, paddingY, graphBottom } = getGraphDimensions(canvas);

    if (showCurrentPrice && currentPrice >= minPrice && currentPrice <= maxPrice) {
      // draw a blue vertical line showing the current price
      // it should extend above the top of the graph, and show the current price
      ctx.strokeStyle = 'rgba(0, 0, 255, 1)';
      ctx.beginPath();
      const x = paddingX + (currentPrice - minPrice) / (maxPrice - minPrice) * graphWidth;
      ctx.moveTo(x, graphBottom);
      ctx.lineTo(x, paddingY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`$${currentPrice.toFixed(2)}`, x, paddingY - 15);
    }

  }, [currentPrice, maxPrice, minPrice, showCurrentPrice,
    // mouse
  ]);


  const drawDataPoints = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');
    const { paddingX, graphWidth, graphHeight, graphBottom } = getGraphDimensions(canvas);

    ctx.fillStyle = 'rgba(255, 0, 0, 1)';
    data.forEach(d => {
      // map the original buy price to the x coordinate
      // map the base_size to the y coordinate if setupOptions.sizeType is 'base'
      // map the buy_quote_size to the y coordinate if setupOptions.sizeType is 'quote'
      const x = paddingX + (d.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
      const y = graphBottom - (d[whichSize] - minSize) / (maxSize - minSize) * graphHeight;

      // draw a thin black curved line to the next point
      if (data.indexOf(d) < data.length - 1) {
        ctx.save();
        ctx.lineWidth = .5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        const nextD = data[data.indexOf(d) + 1];
        const nextX = paddingX + (nextD.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
        const nextY = graphBottom - (nextD[whichSize] - minSize) / (maxSize - minSize) * graphHeight;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x, y, nextX, nextY, nextX, nextY);
        ctx.stroke();
        ctx.restore();
      }

      // draw the point
      ctx.fillStyle = showSells
        ? 'rgba(0, 150, 0, 1)'
        : 'rgba(0, 150, 0, 1)';
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
      ctx.fill();

      if (showSells) {
        // draw a green point for the sell price
        ctx.fillStyle = 'rgba(255, 0, 0, 1)';
        ctx.beginPath();
        ctx.arc(paddingX + (d.original_sell_price - minPrice) / (maxPrice - minPrice) * graphWidth, y, 1.5, 0, 2 * Math.PI);
        ctx.fill();

        // draw a black line from the buy price to the sell price
        // the line should be drawn from the center of the point to the center of the sell price point
        ctx.save();
        ctx.lineWidth = .5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(paddingX + (d.original_sell_price - minPrice) / (maxPrice - minPrice) * graphWidth, y);
        ctx.stroke();
        ctx.restore();

      }
    });
  }, [data, maxPrice, minPrice, maxSize, minSize, showSells, whichSize]);

  const drawTicks = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');
    const { paddingX, paddingY, graphWidth, graphHeight, graphBottom, graphRight } = getGraphDimensions(canvas);

    const numXTicks = 5;
    // tick interval should take padding into account
    const xTickInterval = graphWidth / (numXTicks - 1);
    for (let i = 0; i < numXTicks; i++) {
      // draw the tick
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.beginPath();
      ctx.moveTo(paddingX + i * xTickInterval, graphBottom);
      ctx.lineTo(paddingX + i * xTickInterval, graphBottom + 5);
      ctx.stroke();

      // draw the tick label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText((minPrice + i * (maxPrice - minPrice) / (numXTicks - 1)).toFixed(2), paddingX + i * xTickInterval, graphBottom + 10);

      if (i === 0) {
        continue;
      }
      // draw a light gray graph line
      ctx.strokeStyle = 'rgba(0, 0, 0, .1)';
      ctx.beginPath();
      ctx.moveTo(paddingX + i * xTickInterval, paddingY);
      ctx.lineTo(paddingX + i * xTickInterval, graphBottom);
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
      ctx.moveTo(paddingX, graphBottom - i * yTickInterval);
      ctx.lineTo(paddingX - 5, graphBottom - i * yTickInterval);
      ctx.stroke();

      // draw the tick label sideways and shifted up
      ctx.save();
      ctx.translate(paddingX - 10, graphBottom - i * yTickInterval);
      ctx.rotate(-Math.PI / 2);
      // shift the text up by 10 pixels
      ctx.translate(10, 0);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText((minSize + i * (maxSize - minSize) / (numYTicks - 1)).toFixed(2), 0, 0);
      ctx.restore();

      if (i === 0) {
        continue;
      }
      // draw a light gray graph line
      ctx.strokeStyle = 'rgba(0, 0, 0, .1)';
      ctx.beginPath();
      ctx.moveTo(paddingX, graphBottom - i * yTickInterval);
      ctx.lineTo(graphRight, graphBottom - i * yTickInterval);
      ctx.stroke();
    }
  }, [maxPrice, minPrice, maxSize, minSize]);

  const drawAxis = useCallback((canvas) => {
    const { paddingX, paddingY, graphBottom, graphRight } = getGraphDimensions(canvas);

    const ctx = canvas.getContext('2d');

    // draw the x axis in black
    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    ctx.beginPath();
    ctx.moveTo(paddingX, graphBottom);
    ctx.lineTo(graphRight, graphBottom);
    ctx.stroke();

    // draw the y axis in black
    ctx.beginPath();
    ctx.moveTo(paddingX, paddingY);
    ctx.lineTo(paddingX, graphBottom);
    ctx.stroke();

    // draw the x axis label below the x axis, and below the tick labels
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillText('Price', canvas.width / 2, graphBottom + 25);

    // draw the y axis labels to the left of the y axis
    ctx.save();
    ctx.translate(paddingX - 5, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Size', 0, -20);
    ctx.restore();
  }, []);

  function getGraphDimensions(canvas) {
    // draw a rectangle inside the canvas with 10% padding in the y direction and 5% padding in the x direction
    // the graph will be drawn inside this rectangle
    // const paddingX = canvas.width * 0.1;
    // const paddingY = canvas.height * 0.13;
    // calculate the padding as pixels instead of a percentage of the canvas size
    const paddingX = 40;
    const paddingY = 40;
    const graphBottom = canvas.height - paddingY;
    const graphRight = canvas.width - paddingX;
    const graphWidth = canvas.width - 2 * paddingX;
    const graphHeight = canvas.height - 2 * paddingY;
    return { paddingX, paddingY, graphWidth, graphHeight, graphBottom, graphRight };
  }

  // draw a graph using the canvas element
  useEffect(() => {
    // get the canvas element
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ensure that there will not be infinity
    if (minPrice === maxPrice || minSize === maxSize) {
      return;
    }

    // make the background a color that will contrast with green and red
    ctx.fillStyle = 'rgba(230, 255, 255, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // check if the data array is empty or contains only null or undefined values
    if (data.length === 0 || data.every(d => !d)) {
      return;
    }

    // draw a rectangle around where the graph will be
    drawGraphBoundary(canvas);

    // draw the x and y axis
    drawAxis(canvas);

    // draw the x axis ticks
    drawTicks(canvas);

    // draw a point for each data point
    drawDataPoints(canvas);

    // show the current price if it is within the range of the graph
    drawPriceTicker(canvas);

  }, [data, canvasRef, scaleToZeroX, scaleToZeroY, drawAxis, drawTicks, drawDataPoints, drawPriceTicker, drawGraphBoundary, maxPrice, minPrice, maxSize, minSize,
    mouse
  ]);


  const drawToolTip = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');
    const { paddingX, paddingY, graphWidth, graphBottom, graphRight } = getGraphDimensions(canvas);

    if (mouse.x > paddingX && mouse.x < graphRight && mouse.y > paddingY && mouse.y < graphBottom) {
      // find the closest point to the mouse
      const closestPoint = data.reduce((prev, curr) => {
        const prevX = paddingX + (prev.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
        const currX = paddingX + (curr.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
        return Math.abs(prevX - mouse.x) < Math.abs(currX - mouse.x) ? prev : curr;
      });

      // draw the vertical line
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.beginPath();
      const x = paddingX + (closestPoint.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
      ctx.moveTo(x, graphBottom);
      ctx.lineTo(x, paddingY);
      ctx.stroke();

      // draw the tooltip with the buy/sell price, and size data. not other data is shown because it would be too crowded
      // if the mouse is too close to the right edge of the canvas, draw the tooltip to the left of the mouse
      const tooltipX = mouse.x > canvas.width - 100 ? mouse.x - 100 : mouse.x;
      // if the mouse is too close to the top edge of the canvas, draw the tooltip below the mouse
      if (showSells) {
        const tooltipY = mouse.y < 30 ? mouse.y + 20 : mouse.y - 50;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillRect(tooltipX, tooltipY, 100, 50);
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Buy: $${closestPoint.original_buy_price.toFixed(2)}`, tooltipX + 5, tooltipY + 5);
        ctx.fillText(`Sell: $${closestPoint.original_sell_price.toFixed(2)}`, tooltipX + 5, tooltipY + 20);
        ctx.fillText(`Size: ${whichSize === 'buy_quote_size' ? '$' : ''}${Number(closestPoint[whichSize]).toFixed(2)} ${whichSize === 'base_size' ? 'ETH' : ''}`, tooltipX + 5, tooltipY + 35);
      } else {

        const tooltipY = mouse.y < 30 ? mouse.y + 20 : mouse.y - 35;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillRect(tooltipX, tooltipY, 100, 35);
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Buy: $${closestPoint.original_buy_price.toFixed(2)}`, tooltipX + 5, tooltipY + 5);
        ctx.fillText(`Size: ${whichSize === 'buy_quote_size' ? '$' : ''}${Number(closestPoint[whichSize]).toFixed(2)} ${whichSize === 'base_size' ? 'ETH' : ''}`, tooltipX + 5, tooltipY + 20);
      }
    }
  }, [mouse, maxPrice, minPrice, showSells, whichSize, data]);

  useEffect(() => {
    // draw the mouse tooltip in a separate useEffect so that only the tooltip is redrawn when the mouse moves
    // draw a vertical line through whichever point is closest to the mouse based on the x values array if the mouse is over the graph
    // need to draw this last so it is on top of the other elements
    const canvas = canvasRef.current;
    // will need to clear the old tooltip before drawing a new one, so save the tooltip data so it can be cleared
    const oldTooltip = {
      x: mouse.x,
      y: mouse.y
    };
    // clear the old tooltip
    const ctx = canvas.getContext('2d');
    const { paddingX, paddingY, graphWidth, graphBottom, graphRight } = getGraphDimensions(canvas);
    if (oldTooltip.x > paddingX && oldTooltip.x < graphRight && oldTooltip.y > paddingY && oldTooltip.y < graphBottom) {
      // find the closest point to the mouse
      const closestPoint = data.reduce((prev, curr) => {
        const prevX = paddingX + (prev.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
        const currX = paddingX + (curr.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
        return Math.abs(prevX - oldTooltip.x) < Math.abs(currX - oldTooltip.x) ? prev : curr;
      });
      // console.log(closestPoint, 'closestPoint');
      // draw the vertical line
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.beginPath();
      const x = paddingX + (closestPoint.original_buy_price - minPrice) / (maxPrice - minPrice) * graphWidth;
      ctx.moveTo(x, graphBottom);
      ctx.lineTo(x, paddingY);
      ctx.stroke();
      // draw the tooltip with the buy/sell price, and size data. not other data is shown because it would be too crowded 
      // if the mouse is too close to the right edge of the canvas, draw the tooltip to the left of the mouse
      const tooltipX = oldTooltip.x > canvas.width - 100 ? oldTooltip.x - 100 : oldTooltip.x;
      // if the mouse is too close to the top edge of the canvas, draw the tooltip below the mouse
      if (showSells) {
        const tooltipY = oldTooltip.y < 30 ? oldTooltip.y + 20 : oldTooltip.y - 50;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillRect(tooltipX, tooltipY, 100, 50);
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Buy: $${closestPoint.original_buy_price.toFixed(2)}`, tooltipX + 5, tooltipY + 5);
        ctx.fillText(`Sell: $${closestPoint.original_sell_price.toFixed(2)}`, tooltipX + 5, tooltipY + 20);
        ctx.fillText(`Size: ${whichSize === 'buy_quote_size' ? '$' : ''}${Number(closestPoint[whichSize]).toFixed(2)} ${whichSize === 'base_size' ? 'ETH' : ''}`, tooltipX + 5, tooltipY + 35);
      } else {
        const tooltipY = oldTooltip.y < 30 ? oldTooltip.y + 20 : oldTooltip.y - 35;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillRect(tooltipX, tooltipY, 100, 35);
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.fillText(`Buy: $${closestPoint.original_buy_price.toFixed(2)}`, tooltipX + 5, tooltipY + 5);
        ctx.fillText(`Size: ${whichSize === 'buy_quote_size' ? '$' : ''}${Number(closestPoint[whichSize]).toFixed(2)} ${whichSize === 'base_size' ? 'ETH' : ''}`, tooltipX + 5, tooltipY + 20);
      }
    }





  }, [mouse, data, drawToolTip]);


  return (
    <>
      <h4>{props.title || "Graph"}</h4>
      {/* {JSON.stringify(mouse)} */}
      <br />
      {/* draw the canvas */}
      <canvas ref={canvasRef}
        // width on mobile should be 300
        // width={window.innerWidth > 500 ? 500 : 300}
        width={
          // get the width of the parent element
          canvasRef.current ? canvasRef.current.parentElement.offsetWidth - 50 : 500
        }
        style={{
          // width: '100%',
          margin: 'auto'
        }}
        // width={500} 
        height={300}
      />
      <br />
      {/* checkboxes for scale to zero */}
      <label>
        <input type="checkbox" checked={scaleToZeroX} onChange={e => setScaleToZeroX(e.target.checked)} />
        Start Price at Zero
      </label>
      <label>
        <input type="checkbox" checked={scaleToZeroY} onChange={e => setScaleToZeroY(e.target.checked)} />
        Start Size at Zero
      </label>
      <br />
      <label>
        <input type="checkbox" checked={showSells} onChange={e => setShowSells(e.target.checked)} />
        Show Sell Prices
      </label>
      {/* checkbox to show current price */}
      <label>
        <input type="checkbox" checked={showCurrentPrice} onChange={e => setShowCurrentPrice(e.target.checked)} />
        Show Current Price
      </label>

    </>
  )




}

export default Graph;
