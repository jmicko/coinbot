import { useCallback, useState } from 'react';
import { useIdentifiers } from './useIdentifiers';

interface UsePutFetchProps<T> {
  url: string;
  options?: RequestInit;
  setData?: React.Dispatch<React.SetStateAction<T>>;
  refreshCallback?: () => void;
  loadingDelay?: number;
  from: string;
}

const usePutFetch = <T>({ url, options, setData, refreshCallback, loadingDelay, from }: UsePutFetchProps<T>) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { fetchIdentifiers } = useIdentifiers();

  const putData = useCallback(async (body?: unknown) => {
    setIsLoading(true);
    try {
      console.log('calling putData from', from, 'with body:', body);

      const identifier = Date.now().toString() + url;
      console.log(identifier, 'identifier from usePutFetch');
      fetchIdentifiers.current.push(identifier);
      console.log(fetchIdentifiers, 'fetchIdentifiers from usePutFetch');

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-identifier': identifier
        },
        body: JSON.stringify(body),
        ...options
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      let data: T | null = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log('data from put fetch from', from, data);
      }

      setData && data && setData(data);

      console.log('calling refreshCallback in put hook from:', from);
      refreshCallback && refreshCallback();
      setError(null);
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
      } else {
        setError(new Error('An unknown error occurred.'));
      }
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, loadingDelay || 0);
    }
  }, [url, options, setData, from, refreshCallback, loadingDelay, fetchIdentifiers]);

  return { isLoading, error, putData };
};

export default usePutFetch;