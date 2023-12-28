import { useState, useEffect, useRef, useCallback } from 'react';
import { FetchError } from '../types';
import { useTimestamps } from '../contexts/useTimestamps';

type FetchDataOptions<T> = {
  url?: string;
  defaultState: T;
  preload: boolean;
  from: string;
};

const useGetFetch = <T,>(url: string, options: FetchDataOptions<T>) => {
  const [data, setData] = useState<T>(options.defaultState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<null | FetchError>(null);
  const [unknownError, setUnknownError] = useState<null | Error>(null);
  const hasFetched = useRef<boolean>(false);
  const { fetchTimestamps } = useTimestamps();


  const fetchData = useCallback(async () => {
    console.log(options.from, '<== fetching data from');
    const whichUrl = options.url ? options.url : url;

    setIsLoading(true);
    try {
      const timestamp = Date.now().toString() + whichUrl;
      console.log(timestamp, 'timestamp from useGetFetch');
      fetchTimestamps.current.push(timestamp);
      console.log(fetchTimestamps, 'fetchTimestamps from useGetFetch');


      const response = await fetch(whichUrl, {
        credentials: 'include', // Include credentials here
        headers: { 'X-Timestamp': timestamp },
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
    } catch (e) {
      if (e instanceof FetchError) {
        setError(e);
        if (e.status === 403) {
          console.log('UNAUTHORIZED! setting data to default state');

          setData(options.defaultState);
        }
      } else if (e instanceof Error) {
        setUnknownError(e);
      } else {
        setUnknownError(new Error('An unknown error occurred.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, options, fetchTimestamps]);

  const clear = useCallback(() => {
    setData(options.defaultState)
    setIsLoading(false)
    setError(null)
  }, [options.defaultState, setData, setIsLoading, setError])

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
    unknownError,
    // timestamps,
  };
};

export default useGetFetch;