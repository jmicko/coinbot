import React, { useState, useEffect, useCallback } from 'react';
import './Draggable.css';
import { useUser } from '../../contexts/useUser';
import { no } from '../../shared';

const Draggable = ({ children, className }: { children: React.ReactNode, className: string }) => {
  const { theme } = useUser();
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    no(e); if (e.stopPropagation) e.stopPropagation();
    setDragging(true);
    setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  }, [pos]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (dragging) {
      setPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [dragging, offset]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const onMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!e.buttons) {
      setDragging(false);
    }
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', onMouseMove);
    } else {
      document.removeEventListener('mousemove', onMouseMove);
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [dragging, onMouseMove, onMouseUp]);

  return (
    <div
      className={className}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      <div
        className={`drag drag-button-touch ${theme}`}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseUp={onMouseUp}
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