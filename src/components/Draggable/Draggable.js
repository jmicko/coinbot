import React, { useState, useEffect } from 'react';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import './Draggable.css';

function Draggable({ children, className }) {
  const [isDragging, setIsDragging] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [canReposition, setCanReposition] = useState(true);
  // offset to see where on the button the user clicked
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [collapseParent, setCollapseParent] = useState(false);
  const { height, width } = useWindowDimensions();
  // find out if we are on a touch device
  const isTouchDevice = ('ontouchstart' in document.documentElement);

  function handleMouseMove(e) {
    if (!isDragging) {
      return;
    }
    setCurrentPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    });
  }

  useEffect(() => {
    // handle mouse events
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)

    };
  }, [isDragging]);

  const style = {
    position: 'relative',
    left: `${currentPosition.x - initialPosition.x}px`,
    top: `${currentPosition.y - initialPosition.y}px`,
  };

  function DragButton(props, { children }) {
    return (
      <div>
        <div className='drag-div'>
          {props.beforeDrag()}
          {!isTouchDevice ? <>
            <div
              className="drag-button-touch"
              onClick={() => setCollapseParent(!collapseParent)}
            >
              {!collapseParent
                ? <center className='collapse-arrows'>
                  &#9650;
                  &#9650;
                  &#9650;
                </center>
                : <center className='collapse-arrows'>
                  &#9660;
                  &#9660;
                  &#9660;
                </center>}
            </div>

            <div
              className="drag-button"
              onMouseDown={(e) => { beginMove(e); }}
              onMouseUp={() => setIsDragging(false)}
            >
              <span className="drag-arrows-left">
                &#10018;
              </span>
              <span className="drag-arrows-center">
                {/* move */}
              </span>
              <span className="drag-arrows-right">
                &#10018;
              </span>
            </div>

          </>
            :
            <div
              className="drag-button-touch"
              onClick={() => setCollapseParent(!collapseParent)}
            >
              {!collapseParent
                ? <center className='collapse-arrows'>
                  &#9650;
                  &#9650;
                  &#9650;
                </center>
                : <center className='collapse-arrows'>
                  &#9660;
                  &#9660;
                  &#9660;
                </center>}
            </div>
          }
          {props.afterDrag()}
        </div>
        {props.header()}
      </div>
    );
  }

  return (
    <div style={style} className={className} >
      {/* pass the dragButton to the children */}
      {children({ DragButton, collapseParent })}
    </div>
  );

  function beginMove(e) {
    setOffset({
      x: canReposition ? 0 : e.clientX - currentPosition.x,
      y: canReposition ? 0 : e.clientY - currentPosition.y,
    });
    setCurrentPosition({
      x: canReposition ? e.clientX : e.clientX - (e.clientX - currentPosition.x),
      y: canReposition ? e.clientY : e.clientY - (e.clientY - currentPosition.y)
    });
    if (canReposition) {
      setInitialPosition({
        x: e.clientX,
        y: e.clientY
      });
      setCanReposition(false);
    }
    setIsDragging(true);
  }
}

export default Draggable;