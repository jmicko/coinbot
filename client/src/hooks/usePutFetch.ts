import { useCallback, useState } from 'react';

interface UsePutFetchProps<T> {
  url: string;
  body?: any;
  options?: RequestInit;
  setData?: React.Dispatch<React.SetStateAction<T>>;
}

const usePutFetch = <T>({ url, body, options, setData }: UsePutFetchProps<T>) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const putData = useCallback(async () => {
    setIsLoading(true);
    try {
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

      const data: T = await response.json();
      setData && data && setData(data);
      setError(null);
    } catch (exception) {
      if (exception instanceof Error) {
        setError(exception);
      } else {
        setError(new Error('An unknown error occurred.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, body, options, setData]);

  return { isLoading, error, putData };
};

export default usePutFetch;