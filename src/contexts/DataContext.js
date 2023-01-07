// DataContext.js
import { createContext, useContext, useEffect } from 'react'
import { useFetchData } from '../hooks/fetchData'

const DataContext = createContext()

export function DataProvider({ children }) {
  // const [data, setData] = useState(null)
  // const [user, setUser] = useState(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState(null)
  const [user, userLoading, userError, refreshUser] = useFetchData('/api/user', { defaultState: {} })

  useEffect(() => {

    // get user data on component load
    console.log(user, '==============useEffect in data context==============')

    // check if user is an empty object
    if (user && Object.keys(user).length === 0 && !userLoading && !userError) {
      console.log('+++++++++++++++++refreshing user+++++++++++++++++')
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
