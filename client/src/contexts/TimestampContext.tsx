// TimestampContext.tsx
import { ReactNode, useEffect, useRef } from 'react'
import { TimestampContext } from './useTimestamps';

export function TimestampProvider({ children }: { children: ReactNode }) {
  const fetchTimestamps = useRef<string[]>([]);

  useEffect(() => {
    const timeStampInterval = setInterval(() => {
      if (fetchTimestamps.current.length > 100) {
        console.log('fetchTimestamps.current.length: ', fetchTimestamps.current.length);
        fetchTimestamps.current.length = 0;
      }
    }, 1000 * 60 * 5);

    return () => clearInterval(timeStampInterval);
  }, []);

  return (
    <TimestampContext.Provider
      value={
        {
          fetchTimestamps
        }
      }>
      {children}
    </TimestampContext.Provider>
  )
}
