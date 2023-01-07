import { useState, useEffect } from 'react'

export function useFetchData(url) {
  const [data, setData] = useState(null)
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
      const response = await fetch(url)
      const data = await response.json()
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

  return [data, isLoading, error, refreshData]
}
