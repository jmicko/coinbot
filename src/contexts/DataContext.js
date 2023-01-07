// DataContext.js
import { createContext, useContext, useEffect } from 'react'
import { useFetchData } from '../hooks/fetchData'

const DataContext = createContext()

export function DataProvider({ children }) {
  // const [data, setData] = useState(null)
  // const [user, setUser] = useState(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState(null)
  const [user, userLoading, userError, refreshUser] = useFetchData('/api/user')

  useEffect(() => {
    // async function fetchData() {
    //   try {
    //     // make a get request to the server to get the user
    //     const response = await fetch('/api/user')
    //     const data = await response.json()
    //     setUser(data)
    //     setIsLoading(false)
    //     console.log(user, 'fetched data from data context')
    //   } catch (error) {
    //     setError(error)
    //     setIsLoading(false)
    //   }
    // }

    // fetchData()

    // get user data on component load
    console.log('==============useEffect in data context==============')
    if (!user && !userLoading && !userError) {
      console.log('==============refreshing user==============')
      refreshUser()
    }
  }, [refreshUser, user])

  return (
    <DataContext.Provider value={{ user, userLoading, userError, refreshUser }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
