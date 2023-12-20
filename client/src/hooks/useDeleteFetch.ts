import { useState, useCallback } from 'react';

interface UseDeleteFetchProps<T> {
  url: string;
  options?: RequestInit;
  setData?: React.Dispatch<React.SetStateAction<T>>;
  refreshCallback?: () => void;
  from: string;
}

const useDeleteFetch = <T>({ url, options, setData, refreshCallback, from }: UseDeleteFetchProps<T>) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteData = useCallback(async (moreUrl?: string) => {
    setIsLoading(true);
    try {
      console.log('calling deleteData from:', from, 'to url:', url + moreUrl);

      const response = await fetch(url + moreUrl || '', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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
  }, [url, options, setData, from, refreshCallback]);

  return { isLoading, error, deleteData, };
};

export default useDeleteFetch;