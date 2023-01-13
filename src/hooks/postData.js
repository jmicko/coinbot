import { useState, useEffect } from 'react'

export function usePostData(url, data, { defaultState, config, notNull }) {
  const [response, setResponse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // create a ref to the notNull array so that it doesn't need to be a dependency
  const notNullRef = useRef();
  notNullRef.current = notNull;

  async function postData() {
    try {
      // check if any of the notNull values are null or undefined
      if (checkFailure()) return;

      console.log('posting data to', url, 'in usePostData hook')
      setIsLoading(true)
      // call with the config object if there is one
      const response = config ? await fetch(url, config) : await fetch(url)
      // check if the response is ok
      if (!response.ok) {
        console.log(response, 'response not ok in usePostData hook')
        setIsLoading(false)
        setError(response)
        return
      }
      const data = await response.json()
      console.log(data, 'posted data to', url, 'in usePostData hook')
      setResponse(data)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      console.log(error, 'error in usePostData hook')
      setError(error)
      setIsLoading(false)
    }
  }

  const postDataCallback = useCallback(postData, [url, config])

  // check if any of the notNull values are null or undefined
  function checkFailure() {
    if (notNullRef.current) {
      for (let i = 0; i < notNullRef.current.length; i++) {
        if (notNullRef.current[i] === null || notNullRef.current[i] === undefined) {
          console.log('null or undefined value in notNull array in usePostData hook')
          return true;
        }
      }
    }
    return false;
  }



  return { response, isLoading, error, postDataCallback }
}
