import React, { useState, useEffect, useCallback } from 'react';
import './Draggable.css';
import { useUser } from '../../contexts/useUser';
import { no } from '../../shared';

const Draggable = ({ children, className }: { children: React.ReactNode, className: string }) => {
  const { theme } = useUser();
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setDragging(true);
    setOffset({ x: clientX - pos.x, y: clientY - pos.y });
  }, [pos]);

  const onDrag = useCallback((clientX: number, clientY: number) => {
    if (dragging) {
      setPos({ x: clientX - offset.x, y: clientY - offset.y });
    }
  }, [dragging, offset]);

  const endDrag = useCallback(() => {
    setDragging(false);
  }, []);




  const onMouseDown = useCallback((e: React.MouseEvent) => {
    no(e); if (e.stopPropagation) e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    no(e); if (e.stopPropagation) e.stopPropagation();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, [startDrag]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    onDrag(e.clientX, e.clientY);
  }, [onDrag]);





  const onTouchMove = useCallback((e: TouchEvent) => {
    no(e); if (e.stopPropagation) e.stopPropagation();
    const touch = e.touches[0];
    onDrag(touch.clientX, touch.clientY);
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
      <div
        className={`drag drag-button-touch ${theme}`}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onMouseEnter={onMouseEnter}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
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

      {children}
    </div>
  );
};

export default Draggable;