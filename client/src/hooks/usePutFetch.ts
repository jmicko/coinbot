import { useCallback, useState } from 'react';

interface UsePutFetchProps<T> {
  url: string;
  options?: RequestInit;
  setData?: React.Dispatch<React.SetStateAction<T>>;
  refreshCallback?: () => void;
  from: string;
}

const usePutFetch = <T>({ url, options, setData, refreshCallback, from }: UsePutFetchProps<T>) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const putData = useCallback(async (body?: unknown) => {
    setIsLoading(true);
    try {
      console.log('calling putData from', from, 'with body:', body);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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
      setIsLoading(false);
    }
  }, [url, options, setData, from, refreshCallback]);

  return { isLoading, error, putData };
};

export default usePutFetch;