// UserContext.js
import { createContext, useContext, useEffect } from 'react'
import { useFetchData } from '../hooks/fetchData.js'

const UserContext = createContext()

const userConfig = {
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
};

export function UserProvider({ children }) {
  const { data: user, isLoading: userLoading, error: userError, refresh: refreshUser, clear: clearUser, deleteData: deleteYourself } 
  = useFetchData('/api/user', { defaultState: {}, config: userConfig })

  // infer theme from user object
  const theme = user.theme;
  const btnColor = user.theme === 'darkTheme' ? 'btn-black' : 'btn-blue';

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
    // console.log(payload, 'payload in login')
    // hit the login POST route
    await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
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
        {
          user, takerFee: user.taker_fee, makerFee: user.maker_fee, userLoading, userError,
          refreshUser, logout, login, registerNew, deleteYourself,
          theme, btnColor
        }
      }>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
