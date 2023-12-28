import { useCallback, useState } from 'react';
import { useTimestamps } from '../contexts/useTimestamps';

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
  const { fetchTimestamps } = useTimestamps();

  const putData = useCallback(async (body?: unknown) => {
    setIsLoading(true);
    try {
      console.log('calling putData from', from, 'with body:', body);

      const timestamp = Date.now().toString() + url;
      console.log(timestamp, 'timestamp from usePutFetch');
      fetchTimestamps.current.push(timestamp);
      console.log(fetchTimestamps, 'fetchTimestamps from usePutFetch');

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp
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
  }, [url, options, setData, from, refreshCallback, loadingDelay]);

  return { isLoading, error, putData };
};

export default usePutFetch;