import { useState, useEffect } from 'react';
import { addProductDecimals } from '../shared';

const useProductDecimals = (product, availableFunds) => {
  const [decimals, setDecimals] = useState({ baseIncrement: 0.1, baseMultiplier: 10, quoteIncrement: 0.01, quoteMultiplier: 10 });

  useEffect(() => {
    if (product && availableFunds?.[product]) {
      const decimals = addProductDecimals(availableFunds?.[product]);
      setDecimals(decimals);
      // console.log('decimals', decimals);
    } else {
      console.log('no product or funds');
    }
  }, [product, availableFunds]);

  return decimals;
}

export { useProductDecimals };