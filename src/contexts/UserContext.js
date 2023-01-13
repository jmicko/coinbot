// UserContext.js
import { createContext, useContext, useEffect } from 'react'
import { useFetchData } from '../hooks/fetchData'

const UserContext = createContext()

const userConfig = {
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
};

export function UserProvider({ children }) {
  const { data: user, isLoading: userLoading, error: userError, refresh: refreshUser, clear: clearUser, deleteData: deleteYourself } = useFetchData('/api/user', { defaultState: {}, config: userConfig })

  useEffect(() => {
    // check if user is an empty object
    if (user && Object.keys(user).length === 0 && !userLoading && !userError) {
      // console.log('+++++++++++++++++refreshing user+++++++++++++++++')
      refreshUser()
    }
    // if (user && userError) {
    //   console.log('+++++++++++++++++clearing user+++++++++++++++++')
    //   clearUser()
    // }

  }, [refreshUser, user, userError, userLoading])

  async function logout() {
    // hit the logout POST route
    await fetch('/api/user/logout', { ...userConfig, method: 'POST' })
    clearUser()
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
    <UserContext.Provider
      value={
        { user, userLoading, userError, refreshUser, logout, login, registerNew, deleteYourself }
      }>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
