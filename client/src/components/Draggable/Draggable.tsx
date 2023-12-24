import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Draggable.css';
import { useUser } from '../../contexts/useUser';
import { no } from '../../shared';
import { useData } from '../../contexts/useData';

const Draggable = ({ children, className, windowBarElements }: { children: React.ReactNode, className: string, windowBarElements?: React.ReactNode[] }) => {
  const { theme } = useUser();
  const { showSettings, setShowSettings } = useData();
  const [collapseParent, setCollapseParent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [draggerOffset, setDraggerOffset] = useState({ x: 0, y: 0 });
  // console.log('rendering draggable');
  const draggerElementRef = useRef<Element | null>(null);

  useEffect(() => {
    draggerElementRef.current = document.querySelector('.move-dragger');
  }, []);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setDragging(true);
    setOffset({ x: clientX - pos.x, y: clientY - pos.y });
    const draggerRect = draggerElementRef.current?.getBoundingClientRect();

    if (draggerRect) {
      setDraggerOffset({ x: draggerRect.left - pos.x, y: draggerRect.top - pos.y });
    }
  }, [pos]);

  const onDrag = useCallback((clientX: number, clientY: number, touching: boolean) => {
    if (dragging) {
      let newX = clientX - offset.x;
      let newY = clientY - offset.y;

      // Get the .move-dragger div's dimensions
      const draggerRect = draggerElementRef.current?.getBoundingClientRect();

      // Ensure the .move-dragger div stays within the viewport
      if (draggerRect && touching) {
        // Left edge
        if (newX < 0 - draggerOffset.x + 3) newX = 0 - draggerOffset.x + 3;
        // Right edge
        if (newX + draggerRect.width > window.innerWidth - draggerOffset.x - 3) newX = window.innerWidth - draggerRect.width - draggerOffset.x - 3;
        // Top edge
        if (newY < 0 - draggerOffset.y + 10) newY = 0 - draggerOffset.y + 10;
        // Bottom edge
        if (newY + draggerRect.height > window.innerHeight - draggerOffset.y - 10) newY = window.innerHeight - draggerRect.height - draggerOffset.y - 10;
      }

      setPos({ x: newX, y: newY });
    }
  }, [dragging, offset]);

  const endDrag = useCallback(() => {
    setDragging(false);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    no(e);
    if (e.stopPropagation) e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    no(e);
    if (e.stopPropagation) e.stopPropagation();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, [startDrag]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (e.stopPropagation) e.stopPropagation();
    onDrag(e.clientX, e.clientY, false);
  }, [onDrag]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    // no(e);
    if (e.stopPropagation) e.stopPropagation();
    const touch = e.touches[0];
    onDrag(touch.clientX, touch.clientY, true);
  }, [onDrag]);


  const onMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!e.buttons) {
      setDragging(false);
    }
  }, []);

  const onMouseUp = endDrag;
  const onTouchEnd = endDrag;

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('touchmove', onTouchMove);
    } else {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
    }

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [dragging, onMouseMove, onTouchMove]);

  return (
    <div
      className={`${className} draggable`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      <div className='window-bar'>
        <button
          className={`btn-logout btn-red close-settings ${theme}`}
          onClick={() => { setShowSettings(!showSettings) }}
        >
          X
        </button>

        {/* &nbsp; */}

        <div
          className={`drag collapse-arrows ${theme}`}
          onMouseDown={(e) => { no(e); if (e.stopPropagation) e.stopPropagation(); }}
          onClick={(e) => { no(e); setCollapseParent(!collapseParent) }}
        >
          {/* <center className='collapse-arrows'> */}
          {!collapseParent
            ? "\u25B2 ".repeat(3)
            : "\u25BC ".repeat(3)
          }
          {/* </center> */}
        </div>

        <div
          className={`drag move-dragger ${theme}`}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onMouseEnter={onMouseEnter}
          onMouseUp={onMouseUp}
          onTouchEnd={onTouchEnd}
        >
          <span>&#10018;</span>
          <span>move</span>
          <span>&#10018;</span>
        </div> {/* move-dragger */}

        {windowBarElements && windowBarElements.length > 0
          && windowBarElements.map((element: React.ReactNode, index: number) => (
            <React.Fragment key={index}>
              {element}
            </React.Fragment>
          ))}
      </div> {/* window-bar */}

      <br />
      {!collapseParent && children}
    </div>
  );
};

export default Draggable;