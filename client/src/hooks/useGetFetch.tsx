import { useState, useEffect } from 'react';

type FetchDataOptions<T> = {
  defaultState: T;
};

const useGetFetch = <T,>(url: string, options: FetchDataOptions<T>) => {
  const [data, setData] = useState<T>(options.defaultState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    console.log('fetching data');

    setIsLoading(true);
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data: T = await response.json();
      console.log(data, 'response after fetching data');
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
  };

  const clear = () => {
    setData(options.defaultState)
    setIsLoading(false)
    setError(null)
  }

  useEffect(() => {
    fetchData();
  }, [url]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
    clear,
  };
};

export default useGetFetch;