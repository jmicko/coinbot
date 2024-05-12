import React, { ReactNode } from 'react';
import './Collapser.css';
import { useData } from '../../hooks/useData';

interface CollapserProps {
  children: ReactNode;
  title: string;
  headerElement?: ReactNode;
}

const childClickHandler = (event: React.MouseEvent) => {
  event.stopPropagation();
  // Other logic for child click handler
};

function Collapser({ children, title, headerElement }: CollapserProps) {
  const { collapses, setCollapses } = useData();
  const collapse = !collapses[title];

  return (
    <>
      <h4
        className={`collapser-title overlay ${!collapse && 'expanded'}`}
        onClick={() =>
          setCollapses({
            ...collapses,
            [title]: collapse
          })
          // setCollapse(!collapse)
        }
      >{collapse
        ? <>&#9654;</>
        : <>&#9660;</>}
        &nbsp;{title}

        <div className={`collapser-header ${collapse && 'hide'}`} >
          {headerElement && typeof headerElement === 'object' && 'type' in headerElement && React.cloneElement(headerElement, { onClick: childClickHandler })}
        </div>

      </h4>
      <div className={`collapser ${collapse && 'hide'}`}>
        {children}
      </div>
    </>
  )
}

export default Collapser;