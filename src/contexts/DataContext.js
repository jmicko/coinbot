// DataContext.js
import { createContext, useContext, useState, useEffect } from 'react'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [data, setData] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // make a get request to the server to get the user
        const response = await fetch('/api/user')
        const data = await response.json()
        setUser(data)
        setIsLoading(false)
        console.log(user, 'fetched data from data context')
      } catch (error) {
        setError(error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <DataContext.Provider value={{ data, isLoading, error }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
