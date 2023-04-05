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
      try{
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
  if (!fs.existsSync('./server/logs')) {
    fs.mkdirSync('./server/logs');
  }

  // if the folder doesn't exist, create it
  if (!fs.existsSync(`./server/logs/${monthFolder}`)) {
    fs.mkdirSync(`./server/logs/${monthFolder}`);
  }

  // write the log to the file
  fs.appendFile(`./server/logs/${monthFolder}/${fileName}`,

  
  // fs.appendFile(`./server/logs/${fileName}.log`,
  
    `${new Date().toISOString()} ${args.join(' ')}\n`,

    (err) => {
      if (err) {
        console.log('error logging to file', err);
      }
    });


}

export { devLog }