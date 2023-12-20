// import { useState, useEffect } from 'react';

// const Loading = () => {
//   const [dots, setDots] = useState(0);
//   const space = '\u2665';

//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       setDots((prevDots) => (prevDots + 1) % 5);
//     }, 100);

//     return () => {
//       clearInterval(intervalId);
//     };
//   }, []);

//   const SpaceLoader = () => <span>{'<' + `.`.repeat(dots) + space.repeat(4 - dots) + '>'}</span>;

//   const DotLoader = () => <span>{'<' + `.`.repeat(dots) + '>'}</span>;

//   {/* <span>{'<' + '.'.repeat(dots) + space + `.`.repeat(4 - dots) + '>'}</span> */ }
//   return ({ SpaceLoader, DotLoader })
// };

// export default Loading;

import { useState, useEffect } from 'react';

const useLoadingDots = () => {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDots((prevDots) => (prevDots + 1) % 5);
    }, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return dots;
};

export const SpaceLoader = () => {
  const dots = useLoadingDots();
  // const heart = '\u2665';
  const space = '\u00A0';
  return <span>{'<' + `.`.repeat(dots) + space.repeat(4 - dots) + '>'}</span>;
};

export const DotLoader = () => {
  const dots = useLoadingDots();
  return <span>{'<' + `.`.repeat(dots) + '>'}</span>;
};

export const WaveLoader = () => {
  const dots = useLoadingDots();
  const middleDot = '\u00B7';
  return <span>{'<' + '.'.repeat(dots) + middleDot + `.`.repeat(4 - dots) + '>'}</span>;
}