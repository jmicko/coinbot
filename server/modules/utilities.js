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
      return JSON.stringify(arg);
    }
    return arg;
  });

  
  fs.appendFile('./server/logs/log.log',
  
    `${new Date().toISOString()} ${args.join(' ')}\n`,

    (err) => {
      if (err) {
        console.log('error logging to file', err);
      }
    });


}

export { devLog }