import React, { useState, useEffect } from 'react';

function Draggable({ children, className }) {
  const [isDragging, setIsDragging] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [canReposition, setCanReposition] = useState(true);
  // offset to see where on the button the user clicked
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function handleMouseMove(e) {
    setMousePosition({ x: e.clientX, y: e.clientY });
    if (!isDragging) {
      return;
    }
    setCurrentPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    });
  }

  function handleTouchMove(e) {
    setMousePosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    if (!isDragging) {
      return;
    }
    setCurrentPosition({
      x: e.touches[0].clientX - offset.x,
      y: e.touches[0].clientY - offset.y
    });
  }


  useEffect(() => {
    // handle mouse events
    document.addEventListener('mousemove', handleMouseMove);
    // handle touch events
    document.addEventListener('touchmove', handleTouchMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleMouseMove);
    };
  }, [isDragging]);

  const style = {
    position: 'relative',
    left: `${currentPosition.x - initialPosition.x}px`,
    top: `${currentPosition.y - initialPosition.y}px`,
  };

  function DragButton() {
    return (
      <button
        onMouseDown={(e) => {
          beginMove(e);
        }}
        onTouchStart={(e) => {
          beginTouchMove(e);
        }}
        onMouseUp={() => setIsDragging(false)}
        onTouchEnd={() => setIsDragging(false)}
      >
        Drag me
      </button>
    );
  }


  return (
    <div style={style} className={className} >
      <DragButton />
      {/* <br />
      {initialPosition.x} - {initialPosition.y} - initial
      <br />
      {currentPosition.x} - {currentPosition.y} - current
      <br />
      {mousePosition.x} - {mousePosition.y} - mouse
      <br />
      {offset.x} - {offset.y} - offset */}
      {children}
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

  function beginTouchMove(e) {
    // setOffset({
    //   x: canReposition ? 0 : e.touches[0].clientX - currentPosition.x,
    //   y: canReposition ? 0 : e.touches[0].clientY - currentPosition.y,
    // });
    // setCurrentPosition({
    //   x: e.touches[0].clientX,
    //   y: e.touches[0].clientY
    // });
    // if (canReposition) {
    //   setInitialPosition({
    //     x: e.touches[0].clientX,
    //     y: e.touches[0].clientY
    //   });
    //   setCanReposition(false);
    // }
    // setIsDragging(true);
  }
}

export default Draggable;
