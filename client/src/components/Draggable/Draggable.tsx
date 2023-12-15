import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../contexts/UserContext.js';
// import { no } from '../../shared.js';
import './Draggable.css';

const no = (e: React.MouseEvent) => { e.preventDefault(); }

// interface DraggableProps {
//   children: React.ReactNode;
//   className: string;
// }

interface DraggerProps {
  beforeDrag: () => React.ReactNode;
  afterDrag: () => React.ReactNode;
  header?: () => React.ReactNode;
}

interface DraggableProps {
  children: (props: { Dragger: React.ComponentType<DraggerProps>, collapseParent: boolean }) => React.ReactNode;
  className: string;
}

function Draggable({ children, className }: DraggableProps) {
  // context
  const { theme } = useUser();

  // state
  const [isDragging, setIsDragging] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [canReposition, setCanReposition] = useState(true);
  // offset to see where on the button the user clicked
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [collapseParent, setCollapseParent] = useState(false);
  // find out if we are on a touch device
  const isTouchDevice = ('ontouchstart' in document.documentElement);

  // functions
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) {
      return;
    }
    setCurrentPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y
    });
  }, [isDragging, offset]);

  function beginMove(e: React.MouseEvent) {
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

  // effects
  useEffect(() => {
    // handle mouse events
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)

    };
  }, [isDragging, handleMouseMove]);

  // components
  function Collapser() {
    return (
      <div
        className={`drag drag-button-touch ${theme}`}
        onMouseDown={(e) => { no(e); if (e.stopPropagation) e.stopPropagation(); }}
        onClick={(e) => { no(e); setCollapseParent(!collapseParent) }}
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
    )
  }

  function DragButton() {
    return (
      <div
        className={`drag drag-button-touch ${theme}`}
        onMouseDown={(e) => { no(e); beginMove(e); }}
        onMouseUp={() => setIsDragging(false)}
      >
        <span className="drag-arrows-left">
          &#10018;
        </span>
        <span className="drag-arrows-center">
          move
        </span>
        <span className="drag-arrows-right">
          &#10018;
        </span>
      </div>
    )
  }

  function Dragger(props: DraggerProps) {
    return (
      <div>
        <div className={`drag drag-div`}>
          {props.beforeDrag()}
          <Collapser />
          {!isTouchDevice && <DragButton />}
          {props.afterDrag()}
        </div>
        {props.header ? props.header() : null}
      </div>
    );
  }

  // styles
  const style: React.CSSProperties = {
    position: 'relative',
    left: `${currentPosition.x - initialPosition.x}px`,
    top: `${currentPosition.y - initialPosition.y}px`,
  };

  return (
    <div style={style} className={className} >
      {/* pass the Dragger to the children */}
      {children({ Dragger, collapseParent })}
    </div>
  );
}

export default Draggable;