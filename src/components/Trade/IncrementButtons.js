import React from 'react';


function IncrementButtons(props) {
  const changeValue = props.changeValue;
  const currentValue = props.currentValue;
  const theme = props.theme;
  const firstButton = props.firstButton;
  const roundTo = props.roundTo;
  // create an array of 4 button values. the first value is the value of firstButton. each subsequent value is 10x the previous value.
  const buttonValues = [firstButton, firstButton * 10, firstButton * 100, firstButton * 1000];
  // create an array of 4 increment buttons. each button has a value of the corresponding value in buttonValues. each button has an onClick function that calls changeValue with the corresponding value in buttonValues.
  const incrementButtons = buttonValues.map((value, i) => {
    // console.log((Number(currentValue) + value), value, 'value');
    return (
      <input key={i + 'increment'} type="button" className={`btn-green ${theme}`} onClick={(event) => changeValue((Number(currentValue) + value).toFixed(roundTo) )} value={`+${value}`}></input>
    );
  });
  // create an array of 4 decrement buttons. each button has a negative value of the corresponding value in buttonValues. each button has an onClick function that calls changeValue with the corresponding value in buttonValues.
  const decrementButtons = buttonValues.map((value, i) => {
    return (
      <input key={i + 'decrement'} type="button" className={`btn-red ${theme}`} onClick={(event) => changeValue((Number(currentValue) - value).toFixed(roundTo) )} value={`-${value}`}></input>
    )
  });
  // return the increment buttons and decrement buttons in a div.
  return (
    <div className="increment-buttons">
      {/* {JSON.stringify(buttonValues)} */}
      <div className="increase">
        {incrementButtons}
      </div>
      <div className="decrease">
        {decrementButtons}
      </div>
    </div>
  );
}

export default IncrementButtons;
