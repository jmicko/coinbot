import { useState, useCallback } from 'react';

interface UseDeleteFetchProps {
  url: string;
  options?: RequestInit;
  setData?: React.Dispatch<React.SetStateAction<any>>;
}

const useDeleteFetch = ({ url, options, setData }: UseDeleteFetchProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(url, { method: 'DELETE', ...options });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
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
  }, [url, options]);

  return {
    isLoading,
    error,
    deleteData,
  };
};

export default useDeleteFetch;