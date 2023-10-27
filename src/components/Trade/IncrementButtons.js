import React, { useState } from 'react';
import { no } from '../../shared.js';
import './IncrementButtons.css';

function IncrementButtons(props) {
  const [multiply, setMultiply] = useState(1);
  const changeValue = props.changeValue;
  const currentValue = props.currentValue;
  const theme = props.theme;
  const firstButton = props.firstButton;
  const roundTo = props.roundTo;

  

  const toFloor = (value) => {
    return Math.floor(value * 10_000_000) / 10_000_000;
  }

  // create an array of 4 button values. the first value is the value of firstButton. each subsequent value is 10x the previous value.
  const buttonValues = [
    toFloor(firstButton * multiply),
    toFloor(firstButton * 10 * multiply),
    toFloor(firstButton * 100 * multiply),
    toFloor(firstButton * 1000 * multiply)
  ];
  // create an array of 4 increment buttons. each button has a value of the corresponding value in buttonValues. each button has an onClick function that calls changeValue with the corresponding value in buttonValues.
  const incrementButtons = buttonValues.map((value, i) => {
    // console.log((Number(currentValue) + value), value, 'value');
    return (
      <input key={i + 'increment'} type="button" className={`btn-green ${theme}`} onClick={(e) => { no(e); changeValue((Number(currentValue) + value).toFixed(roundTo)) }} value={`+${value}`}></input>
    );
  });
  // create an array of 4 decrement buttons. each button has a negative value of the corresponding value in buttonValues. each button has an onClick function that calls changeValue with the corresponding value in buttonValues.
  const decrementButtons = buttonValues.map((value, i) => {
    return (
      <input key={i + 'decrement'} type="button" className={`btn-red ${theme}`} onClick={(e) => { no(e); console.log(roundTo, 'roundTo'); changeValue((Number(currentValue) - value).toFixed(roundTo)) }} value={`-${value}`}></input>
    )
  });
  // return the increment buttons and decrement buttons in a div.
  return (
    <div className="increment-buttons">
      <button className={`btn-blue ${theme} changers left`} onClick={(e) => { no(e); setMultiply(multiply / 10) }}>{'<'}</button>
      {/* {JSON.stringify(buttonValues)} */}
      <div className='changers'>
        <div className="increase">
          {incrementButtons}
        </div>
        <div className="decrease">
          {decrementButtons}
        </div>
      </div>
      <button className={`btn-blue ${theme} changers right`} onClick={(e) => { no(e); setMultiply(multiply * 10) }}>{'>'}</button>
    </div >
  );
}

export default IncrementButtons;
