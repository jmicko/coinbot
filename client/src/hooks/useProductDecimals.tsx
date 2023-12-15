import { useState, useEffect } from 'react';
import { addProductDecimals } from '../shared';
import { AvailableFunds, Decimals } from '../types';


const useProductDecimals = (product: string, availableFunds:AvailableFunds ) => {
  const [decimals, setDecimals] = useState<Decimals>({
    baseIncrement: 0.1,
    baseMultiplier: 10,
    quoteIncrement: 0.01,
    quoteMultiplier: 10,
    base_increment: '0.1',
    quote_increment: '0.01',
    base_increment_decimals: 1,
    quote_increment_decimals: 2,
    base_inverse_increment: 10,
    quote_inverse_increment: 100,
    price_rounding: 2,
  });

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