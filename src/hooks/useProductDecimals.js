import { useState, useEffect } from 'react';
import { calculateProductDecimals } from '../shared';

const useProductDecimals = (product, availableFunds) => {
  const [decimals, setDecimals] = useState({ baseIncrement: 0.1, baseMultiplier: 10, quoteIncrement: 0.01, quoteMultiplier: 10 });

  useEffect(() => {
    if (product && availableFunds?.[product]) {
      const decimals = calculateProductDecimals(availableFunds?.[product]);
      setDecimals(decimals);
    } else {
      console.log('no product or funds');
    }
  }, [product, availableFunds?.[product]]);

  return decimals;
}

export { useProductDecimals };