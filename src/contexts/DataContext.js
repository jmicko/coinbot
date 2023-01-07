// DataContext.js
import { createContext, useContext, useEffect } from 'react'
import { useFetchData } from '../hooks/fetchData'

const DataContext = createContext()

export function DataProvider({ children }) {
  // const [data, setData] = useState(null)
  // const [user, setUser] = useState(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState(null)
  const { data: user, isLoading: userLoading, error: userError, refreshData: refreshUser, clearData: clearUser } = useFetchData('/api/user', { defaultState: {} })



  useEffect(() => {

    // get user data on component load
    console.log(user, '==============useEffect in data context==============')

    // check if user is an empty object
    if (user && Object.keys(user).length === 0 && !userLoading && !userError) {
      console.log('+++++++++++++++++refreshing user+++++++++++++++++')
      refreshUser()
    }
  }, [refreshUser, user])

  async function logout() {
    await fetch('/api/user/logout')
    clearUser()
    // here is a list of things from the old saga that will need to be migrated
    // yield put({ type: 'CLEAR_LOGIN_ERROR' });
    // yield put({ type: 'CLEAR_REGISTRATION_ERROR' });
    // yield put({ type: 'CLEAR_BOT_ERRORS' });
    // yield put({ type: 'CLEAR_API_ERROR' });
    // yield put({ type: 'UNSET_USER' }); ======== DONE
    // yield put({ type: 'UNSET_ORDERS' });
    // yield put({ type: 'UNSET_ACCOUNT' });
    // yield put({ type: 'UNSET_PROFITS' });
  }

  return (
    <DataContext.Provider
      value={
        { user, userLoading, userError, refreshUser, logout }
      }>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
