// DataContext.js
import { createContext, useContext, useEffect } from 'react'
import { useFetchData } from '../hooks/fetchData'

const DataContext = createContext()

const userConfig = {
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
};

export function DataProvider({ children }) {
  // const [data, setData] = useState(null)
  // const [user, setUser] = useState(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState(null)
  const { data: user, isLoading: userLoading, error: userError, refreshData: refreshUser, clearData: clearUser } = useFetchData('/api/user', { defaultState: {}, config: userConfig })



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
    // hit the logout POST route
    await fetch('/api/user/logout', { ...userConfig, method: 'POST' })
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

  async function login(payload) {
    console.log(payload, 'payload in login')
    // hit the login POST route
    await fetch('/api/user/login', { ...userConfig, method: 'POST', body: JSON.stringify(payload) })
    refreshUser()
  }

  async function registerNew(payload) {
    console.log(payload, 'payload in register')
    // hit the register POST route
    await fetch('/api/user/register', { headers: { 'Content-Type': 'application/json' }, method: 'POST', body: JSON.stringify(payload) })
    login(payload);
  }


  return (
    <DataContext.Provider
      value={
        { user, userLoading, userError, refreshUser, logout, login, registerNew }
      }>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
