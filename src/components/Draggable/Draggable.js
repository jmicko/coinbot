import React, { useState, useEffect } from 'react';
import './Draggable.css';

function Draggable({ children, className }) {
  const [isDragging, setIsDragging] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [canReposition, setCanReposition] = useState(true);
  // offset to see where on the button the user clicked
  const [offset, setOffset] = useState({ x: 0, y: 0 });

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
          <div
            className="drag-button"
            onMouseDown={(e) => { beginMove(e); }}
            onMouseUp={() => setIsDragging(false)}
          >
          </div>
          {props.afterDrag()}
        </div>
        {props.header()}
      </div>
    );
  }

  return (
    <div style={style} className={className} >
      {/* pass the dragButton to the children */}
      {children({ DragButton })}
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