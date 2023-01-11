// DebouncedInput.js
import React, { useState, useEffect, useCallback } from 'react';

const DebouncedInput = ({ onChange, initValue, type, name, ...otherProps }) => {
  const [value, setValue] = useState(initValue);
  const [timeoutId, setTimeoutId] = useState(null);

  // memoize the onChange callback
  const memoizedOnChange = useCallback(onChange, [onChange]);

  useEffect(() => {
    const debouncedCallback = (newValue) => {
      clearTimeout(timeoutId);
      const id = setTimeout(() => {
        console.log(newValue, 'changing newValue in debouncedCallback in DebouncedInput.js')
        memoizedOnChange(newValue)
        // onChange(newValue)
      }, 1000);
      setTimeoutId(id);
    };

    debouncedCallback(value);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value]);

  const handleChange = (e) => {
    console.log(e.target.value, 'e.target.value')
    // if the value is a number or can be parsed as a number, set the value to the number
    if (!isNaN(e.target.value)) {
      setValue(Number(e.target.value));
    }

  };

  return <input type={type} name={name} value={value} onChange={handleChange} {...otherProps} />;
}


export default DebouncedInput;