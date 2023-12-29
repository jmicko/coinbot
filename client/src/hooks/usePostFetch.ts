import { useState, useCallback } from 'react';
import { FetchError } from '../types';
import { useIdentifiers } from './useIdentifiers';

interface usePostFetchProps<T> {
  url: string;
  options?: RequestInit;
  setData?: React.Dispatch<React.SetStateAction<T>>;
  refreshCallback?: () => void;
  from: string;
}

const usePostFetch = <T>({ url, options, setData, refreshCallback, from }: usePostFetchProps<T>) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<null | FetchError>(null);
  const [unknownError, setUnknownError] = useState<null | Error>(null);
  const { fetchIdentifiers } = useIdentifiers();

  const postData = useCallback(async (body?: unknown) => {
    setIsLoading(true);
    try {
      console.log('calling postData from', from);
      const identifier = Date.now().toString() + url;
      console.log(identifier, 'identifier from usePutFetch');
      fetchIdentifiers.current.push(identifier);
      console.log(fetchIdentifiers, 'fetchIdentifiers from usePutFetch');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-identifier': identifier
        },
        body: JSON.stringify(body),
        ...options
      });

      if (!response.ok) {
        throw new FetchError(`Error: ${response.status}`, response.status);
      }

      let data: T | null = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log('data from post fetch from', from, data);
      }

      console.log('calling refreshCallback in post hook from:', from);
      refreshCallback && refreshCallback();

      setData && data && setData(data);

      setError(null);
    } catch (e) {
      if (e instanceof FetchError) {
        setError(e);
      } else if (e instanceof Error) {
        setUnknownError(e);
      } else {
        setUnknownError(new Error('An unknown error occurred.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, options, setData, from, refreshCallback, fetchIdentifiers]);

  return { isLoading, error, postData, unknownError };
};

export default usePostFetch;