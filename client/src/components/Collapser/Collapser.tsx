import React, { useState } from 'react';

function Collapser({ children, title }: { children: React.ReactNode, title: string }) {
  const [collapse, setCollapse] = useState(true);

  return (
    <>
      <h4 onClick={() => setCollapse(!collapse)}>{title} {collapse ? <>&#9660;</> : <>&#9650;</>}</h4>
      <div className={`collapser ${collapse && 'hide'}`}>
        {children}
      </div>
    </>
  )
}

export default Collapser;