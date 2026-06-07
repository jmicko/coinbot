import { devLog } from './logger.js';

// function to pause for x milliseconds in any async function
function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const granularities = [
  { name: 'ONE_MINUTE', readable: 'One Minute', value: 60 },
  { name: 'FIVE_MINUTE', readable: 'Five Minutes', value: 300 },
  { name: 'FIFTEEN_MINUTE', readable: 'Fifteen Minutes', value: 900 },
  { name: 'THIRTY_MINUTE', readable: 'Thirty Minutes', value: 1800 },
  { name: 'ONE_HOUR', readable: 'One Hour', value: 3600 },
  { name: 'TWO_HOUR', readable: 'Two Hours', value: 7200 },
  { name: 'SIX_HOUR', readable: 'Six Hours', value: 21600 },
  { name: 'ONE_DAY', readable: 'One Day', value: 86400 },
]

function addProductDecimals(product) {

  const base_increment_decimals = findDecimals(product.base_increment);
  const quote_increment_decimals = findDecimals(product.quote_increment);
  const quote_inverse_increment = Math.pow(10, quote_increment_decimals);
  const base_inverse_increment = Math.pow(10, base_increment_decimals);
  const price_rounding = Math.pow(10, quote_increment_decimals - 2);

  const pbd = base_increment_decimals || 2; // pbd = product base decimals
  const pqd = quote_increment_decimals || 2; // pqd = product quote decimals

  const productWithDecimals = {
    ...product,
    base_increment_decimals,
    quote_increment_decimals,
    base_inverse_increment,
    quote_inverse_increment,
    price_rounding,
    pqd,
    pbd,
  }
  return productWithDecimals;

  function findDecimals(number) {
    const decimalPlaces = String(number ?? '').split('.')[1];
    if (!decimalPlaces) {
      return 0;
    }

    const firstNonZero = decimalPlaces.split('').findIndex((char) => char !== '0');
    return firstNonZero === -1 ? 0 : firstNonZero + 1;
  }
}


export { devLog, sleep, granularities, addProductDecimals };
