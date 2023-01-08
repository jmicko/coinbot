import { useState } from 'react'

export function useFetchData(url, { defaultState, config }) {
  const [data, setData] = useState(defaultState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)


  async function fetchData() {
    try {
      console.log('fetching data from', url, 'in useFetchData hook')
      setIsLoading(true)
      // call with the config object if there is one
      const response = config ? await fetch(url, config) : await fetch(url)
      // const other = await response;
      // console.log(other, 'other');
      const data = await response.json()
      console.log(data, 'fetched data from', url, 'in useFetchData hook')
      setData(data)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      setError(error)
      setIsLoading(false)
    }
  }

  function refresh() {
    fetchData()
  }

  function clear() {
    setData(defaultState)
    setIsLoading(false)
    setError(null)
  }

  return { data, isLoading, error, refresh, clear }
}