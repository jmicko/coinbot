import { useCallback, useEffect, useRef, useState } from 'react'

export function useFetchData(url, { defaultState, config, notNull }) {
  const [data, setData] = useState(defaultState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // create a ref to the notNull array so that it doesn't need to be a dependency
  const notNullRef = useRef();
  notNullRef.current = notNull;

  // I'm sure there's a better way to do this, but I'm not sure what it is
  const checkFailureCallback = useCallback(checkFailure, [notNullRef, url])
  const fetchDataCallback = useCallback(fetchData, [url, config, checkFailureCallback])
  const postDataCallback = useCallback(postData, [url, config, checkFailureCallback])
  const putDataCallback = useCallback(putData, [url, checkFailureCallback])

  // GET function
  async function fetchData() {
    try {
      // check if any of the notNull values are null or undefined
      if (checkFailureCallback()) return;

      console.log('fetching data from', url, 'in useFetchData hook')
      setIsLoading(true)
      // call with the config object if there is one
      const response = config ? await fetch(url, config) : await fetch(url)
      // check if the response is ok
      if (!response.ok) {
        console.log(response, 'response not ok in useFetchData hook')
        setIsLoading(false)
        setError(response)
        return
      }
      const data = await response.json()
      console.log(data, 'fetched data from', url, 'in useFetchData hook')
      setData(data)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      console.log(error, 'error in useFetchData hook')
      setError(error)
      setIsLoading(false)
    }
  }


  // POST function
  async function postData(dataToPost) {
    try {
      // check if any of the notNull values are null or undefined
      if (checkFailureCallback()) return;

      console.log('posting data to', url, 'in usePostData hook')
      setIsLoading(true)
      // call with the config object if there is one. If there is no config object, create one with the data

      const response = config
        ? await fetch(url, { ...config, body: JSON.stringify(dataToPost), method: 'POST' })
        : await fetch(url, { method: 'POST', body: JSON.stringify(dataToPost) })
      // check if the response is ok
      if (!response.ok) {
        console.log(response, 'response not ok in usePostData hook')
        setIsLoading(false)
        setError(response)
        return
      }
      const data = await response.json()
      console.log(data, 'posted data to', url, 'in usePostData hook')
      // setResponse(data)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      console.log(error, 'error in usePostData hook')
      setError(error)
      setIsLoading(false)
    }
  }

  // PUT function
  async function putData(dataToPut) {
    try {
      // check if any of the notNull values are null or undefined
      console.log(dataToPut, 'putting dataToPut to', url, 'in usePutdataToPut hook')
      if (checkFailureCallback()) return;

      setIsLoading(true)

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToPut)
      })
      console.log(response, 'response in usePutdataToPut hook')
      // check if the response is ok
      if (!response.ok) {
        console.log(response, 'response not ok in usePutdataToPut hook')
        setIsLoading(false)
        setError(response)
        return
      }
      const json = await response.json()
      console.log(json, 'put data to', url, 'in usePutData hook')
      // setResponse(json)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      console.log(error, 'error in usePutData hook')
      setError(error)
      setIsLoading(false)
    }
  }


  function checkFailure() {
    if (notNullRef.current && notNullRef.current.length > 0 && Array.isArray(notNullRef.current) && notNullRef.current.some(value => value === null || value === undefined)) {
      for (let i = 0; i < notNullRef.current.length; i++) {
        if (notNullRef.current[i] === null || notNullRef.current[i] === undefined) {
          console.log('notNullRef.current value is null or undefined, not fetching data from', url, 'in useFetchData hook');
          setIsLoading(false);
          setError({ message: 'null or undefined value in notNullRef.current array' });
          return true;
        }
      }
    }
  }


  useEffect(() => {
    console.log('useEffect in useFetchData hook -------- getting data on load from', url, '--------')
    fetchDataCallback();
  }, [fetchDataCallback, url])


  function refresh() {
    fetchDataCallback()
  }

  async function createData(data) {
    try {
      console.log(data, 'creating data in useFetchData hook ')
      await postDataCallback(data)
      await fetchDataCallback();
    } catch (err) {
      console.log(err, 'error in updateData function in useFetchData hook')
    }
  }

  async function updateData(data) {
    try {
      console.log(data, 'updating data in useFetchData hook  %%%%%%%%%%%%%%')
      await putDataCallback(data);
      await fetchDataCallback();
    } catch (err) {
      console.log(err, 'error in updateData function in useFetchData hook')
    }
  }

  function clear() {
    setData(defaultState)
    setIsLoading(false)
    setError(null)
  }

  return { data, isLoading, error, refresh, clear, createData, updateData }
}
