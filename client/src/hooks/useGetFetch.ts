import { useState, useEffect, useRef, useCallback } from 'react';
import { FetchError } from '../types';
import { useIdentifiers } from './useIdentifiers';

type FetchDataOptions<T> = {
  url: string;
  defaultState: T;
  preload: boolean;
  from: string;
};

// Dedupe only currently running GETs; completed responses are not cached.
const inFlightGetRequests = new Map<string, Promise<unknown>>();

async function getJson<T>(url: string, identifier: string): Promise<T> {
  const existingRequest = inFlightGetRequests.get(url);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = fetch(url, {
    credentials: 'include',
    headers: { 'X-identifier': identifier },
  }).then(async response => {
    if (!response.ok) {
      throw new FetchError(`Error: ${response.status}`, response.status);
    }

    return response.json() as Promise<T>;
  });

  inFlightGetRequests.set(url, request);

  try {
    return await request;
  } finally {
    if (inFlightGetRequests.get(url) === request) {
      inFlightGetRequests.delete(url);
    }
  }
}

const useGetFetch = <T,>(options: FetchDataOptions<T>) => {
  const [data, setData] = useState<T>(options.defaultState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<null | FetchError>(null);
  const [unknownError, setUnknownError] = useState<null | Error>(null);
  const isMounted = useRef<boolean>(false);
  const latestRequest = useRef<number>(0);
  const { fetchIdentifiers } = useIdentifiers();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      latestRequest.current += 1;
    };
  }, []);

  const fetchData = useCallback(async () => {
    // console.log(options.from, '<== fetching data from');
    // const whichUrl = options.url ? options.url : url;

    const requestNumber = latestRequest.current + 1;
    latestRequest.current = requestNumber;
    setIsLoading(true);
    try {
      const identifier = Date.now().toString() + options.url;
      // console.log(identifier, 'identifier from useGetFetch');
      fetchIdentifiers.current.push(identifier);
      // console.log(fetchIdentifiers, 'fetchIdentifiers from useGetFetch');

      const data = await getJson<T>(options.url, identifier);
      if (!isMounted.current || latestRequest.current !== requestNumber) {
        return;
      }
      // if (options.from === 'messages in data context') {
      // console.log(data, 'data from messages in data context:');
      // }
      setData(data);
      setError(null);
      setUnknownError(null);
    } catch (e) {
      if (!isMounted.current || latestRequest.current !== requestNumber) {
        return;
      }
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
      if (isMounted.current && latestRequest.current === requestNumber) {
        setIsLoading(false);
      }
    }
  }, [options, fetchIdentifiers]);

  const clear = useCallback(() => {
    setData(options.defaultState)
    setIsLoading(false)
    setError(null)
    setUnknownError(null)
  }, [options.defaultState, setData, setIsLoading, setError])

  useEffect(() => {
    if (options.preload
    ) {
      // console.log('PRELOADING DATA AGAIN FROM:', options.from);

      fetchData();
    }
  }, [options.preload, fetchData, options.from, options.url]);

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
