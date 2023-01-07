import { useState, useEffect } from 'react'

export function useFetchData(url, {defaultState, config}) {
  const [data, setData] = useState(defaultState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // useEffect(() => {
  //   setIsLoading(true)
  //   setError(null)
  // }, [url])

  async function fetchData() {
    try {
      console.log('fetching data')
      setIsLoading(true)
      // call with the config object if there is one
      const response = config ? await fetch(url, config) : await fetch(url)
      const data = await response.json()
      console.log(data, 'fetched data')
      setData(data)
      setIsLoading(false)
      setError(null)
    } catch (error) {
      setError(error)
      setIsLoading(false)
    }
  }

  function refreshData() {
    fetchData()
  }

  function clearData() {
    setData(defaultState)
    setIsLoading(false)
    setError(null)
  }

  return {data, isLoading, error, refreshData, clearData}
}
