import { useState, useCallback } from 'react';

interface usePostFetchProps<T> {
  url: string;
  body: T;
  options?: RequestInit;
  setData: React.Dispatch<React.SetStateAction<T>>;
} 

const usePostFetch = <T>({ url, body, options, setData }: usePostFetchProps<T>) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const postData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(url, { 
        method: 'POST', 
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
      setData(data);

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
  }, [url, body, options]);

  return {
    isLoading,
    error,
    postData,
  };
};

export default usePostFetch;