// IdentifierContext.tsx
import { ReactNode, useEffect, useRef } from 'react'
import { IdentifierContext } from './useIdentifiers';

export function IdentifierProvider({ children }: { children: ReactNode }) {
  const fetchIdentifiers = useRef<string[]>([]);

  useEffect(() => {
    const timeStampInterval = setInterval(() => {
      if (fetchIdentifiers.current.length > 100) {
        console.log('fetchIdentifiers.current.length: ', fetchIdentifiers.current.length);
        fetchIdentifiers.current.length = 0;
      }
    }, 1000 * 60 * 5);

    return () => clearInterval(timeStampInterval);
  }, []);

  return (
    <IdentifierContext.Provider
      value={
        {
          fetchIdentifiers
        }
      }>
      {children}
    </IdentifierContext.Provider>
  )
}
