import { useState, useCallback } from 'react';

interface UseDeleteFetchProps {
  url: string;
  options?: RequestInit;
  setData?: React.Dispatch<React.SetStateAction<any>>;
  refreshCallback?: () => void;
  from: string;
}

const useDeleteFetch = <T>({ url, options, setData, refreshCallback, from }: UseDeleteFetchProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteData = useCallback(async (body?: any) => {
    setIsLoading(true);
    try {
      console.log('calling deleteData from:', from, 'to url:', url);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        // body: body ? JSON.stringify(body) : undefined,
        ...options
      });
      console.log('done calling deleteData from:', from, 'to url:', url);
      
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

      console.log('calling refreshCallback in delete hook from:', from);
      refreshCallback && refreshCallback();
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
  }, [url, options]);

  return { isLoading, error, deleteData, };
};

export default useDeleteFetch;