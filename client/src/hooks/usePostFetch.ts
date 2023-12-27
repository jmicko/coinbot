import { useState, useCallback } from 'react';
import { FetchError } from '../types';

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

  const postData = useCallback(async (body?: unknown) => {
    setIsLoading(true);
    try {
      console.log('calling postData from', from);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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

      // if (setData && data) {
      //   console.log('5555555555555555555555 5 5 5 5 5 5 5 setting data from put fetch from', from);
      //   console.log(data, 'data from post fetch from', from);

      //   setData(data);
      //   // console.log('successfully set data from post fetch from', from);

      // }
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
  }, [url, options, setData, from, refreshCallback]);

  return { isLoading, error, postData, unknownError };
};

export default usePostFetch;