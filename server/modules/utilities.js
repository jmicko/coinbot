import fs from 'fs';

// dev version of console.log that only logs when in dev mode
function devLog(...args) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
  // console.log('devLog', args);
  // write to a log file withe a timestamp

  // if any of the args are objects, stringify them
  args = args.map((arg) => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (err) {
        console.log('error stringifying object', err);
      }
    }
    return arg;
  });

  // check if it is an error
  if (args[0] instanceof Error) {
    // if it is an error, get the error message and stack trace
    // log each on a separate line, and each property on a separate line if they are objects or arrays
    const error = args[0];
    const errorMessage = error.message;
    const errorStack = error.stack;
    const errorName = error.name;
    const errorDate = new Date().toISOString();
    const errorArgs = args.slice(1);
    const errorArgsString = errorArgs.join(' ');
    const errorString = `${errorDate} ${errorName} ${errorMessage} ${errorStack} ${errorArgsString}`;
    args = [errorString];


  }


  // the file name is the current date
  const fileName = `${new Date().toISOString().split('T')[0]}.log`;

  // files should go in a subfolder by month
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const monthFolder = `${year}-${month}`;

  // if the logs folder doesn't exist, create it
  if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
  }

  // if the folder doesn't exist, create it
  if (!fs.existsSync(`./logs/${monthFolder}`)) {
    fs.mkdirSync(`./logs/${monthFolder}`);
  }

  // write the log to the file
  fs.appendFile(`./logs/${monthFolder}/${fileName}`,


    // fs.appendFile(`./logs/${fileName}.log`,

    `${new Date().toISOString()} ${args.join(' ')}\n`,

    (err) => {
      if (err) {
        console.log('error logging to file', err);
      }
    });


}

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
    return number?.split('.')[1]?.split('').findIndex((char) => char !== '0') + 1;
  }
}


export { devLog, sleep, granularities, addProductDecimals };