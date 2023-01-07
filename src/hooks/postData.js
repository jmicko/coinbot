import { useState, useEffect } from 'react'

export function usePostData(url, data) {
  const [response, setResponse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function postData() {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const responseData = await response.json()
        setResponse(responseData)
        setIsLoading(false)
      } catch (error) {
        setError(error)
        setIsLoading(false)
      }
    }

    postData()
  }, [url, data])

  return { response, isLoading, error }
}
