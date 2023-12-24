import { useState, useEffect, useRef, useCallback } from 'react';
import { FetchError } from '../types';

type FetchDataOptions<T> = {
  url?: string;
  defaultState: T;
  preload: boolean;
  from: string;
};

const useGetFetch = <T,>(url: string, options: FetchDataOptions<T>) => {
  const [data, setData] = useState<T>(options.defaultState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef<boolean>(false);

  const fetchData = useCallback(async () => {
    console.log(options.from, '<== fetching data from');
    const whichUrl = options.url ? options.url : url;

    setIsLoading(true);
    try {
      const response = await fetch(whichUrl, {
        credentials: 'include', // Include credentials here
      });

      if (!response.ok) {
        throw new FetchError(`Error: ${response.status}`, response.status);
      }
      const data: T = await response.json();
      // if (options.from === 'messages in data context') {
      console.log(data, 'data from messages in data context:');
      // }
      setData(data);
      setError(null);
    } catch (error) {
      if (error instanceof FetchError) {

        setError(error);
      } else if (error instanceof Error) {
        setError(error);
      } else {
        setError(new Error('An unknown error occurred.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, options]);

  const clear = useCallback(() => {
    setData(options.defaultState)
    setIsLoading(false)
    setError(null)
  }, [options.defaultState]);

  useEffect(() => {
    // options.preload && !hasFetched.current && fetchData();
    if (options.preload && !hasFetched.current) {
      fetchData();
      // hasFetched.current = true;
    }
    return () => {
      hasFetched.current = true;
    }
  }, [url, options.preload, fetchData]);

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