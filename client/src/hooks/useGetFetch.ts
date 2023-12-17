import { useState, useEffect, useRef } from 'react';

type FetchDataOptions<T> = {
  defaultState: T;
  preload: boolean;
  from: string;
};

const useGetFetch = <T,>(url: string, options: FetchDataOptions<T>) => {
  const [data, setData] = useState<T>(options.defaultState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef<boolean>(false);

  const fetchData = async () => {
    console.log(options.from, '<== fetching data from');

    setIsLoading(true);
    try {
      const response = await fetch(url, {
        credentials: 'include', // Include credentials here
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
  };

  const clear = () => {
    setData(options.defaultState)
    setIsLoading(false)
    setError(null)
  }

  useEffect(() => {
    // options.preload && !hasFetched.current && fetchData();
    if (options.preload && !hasFetched.current) {
      fetchData();
      // hasFetched.current = true;
    }
    return () => {
      hasFetched.current = true;
    }
  }, [url]);

  return {
    data,
    setData,
    isLoading,
    error,
    refresh: fetchData,
    clear,
  };
};

export default useGetFetch;