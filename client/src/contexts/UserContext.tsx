// UserContext.js
import { createContext, useContext, useEffect, ReactNode } from 'react'
// import { useFetchData } from '../hooks/fetchData.js'
import useGetFetch from '../hooks/useGetFetch.js';
import useDeleteFetch from '../hooks/useDeleteFetch.js';

type User = {
  theme: string;
  // other properties...
};

const UserContext = createContext<any | null>(null)

const userConfig = {
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
};

export function UserProvider({ children }: { children: ReactNode }) {
  const {
    // isLoading: deleteLoading,
    // error: deleteError,
    deleteData: deleteYourself
  } = useDeleteFetch('/api/user');

  const {
    data: user,
    setData: setUser,
    isLoading: userLoading,
    error: userError,
    refresh: refreshUser,
    clear: clearUser,
  } = useGetFetch<User | null>(
    '/api/user',
    { defaultState: null }
  );

  // infer theme from user object
  const theme = user ? user.theme : 'darkTheme';
  const btnColor = theme === 'darkTheme' ? 'btn-black' : 'btn-blue';

  // useEffect(() => {
  //     refreshUser()
  // }, [])

  // useEffect(() => {
  //   // check if user is an empty object
  //   if (user && Object.keys(user).length === 0 && !userLoading && !userError) {
  //     refreshUser()
  //     console.log('ALERT ALERT ALERT ALERT ALERT EMPTY USER OBJECT ALERT ALERT ALERT ALERT ALERT');

  //   }
  // }, [refreshUser, user, userError, userLoading])

  async function logout() {
    await fetch('/api/user/logout', { ...userConfig, method: 'POST' })
    clearUser()
  }

  async function login(payload: any) {
    console.log(userLoading, 'userLoading before login', userError, 'userError before ...');
    const response = await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (response.ok) {
      const userData = await response.json();
      // Save userData somewhere (e.g., in state or context)
      setUser(userData);
    } else {
      console.log('Login failed');
    }
    console.log(user, response, 'logged in user, refreshing user');
    console.log(userLoading, 'userLoading', userError, 'userError');
    // clearUser();
    // setTimeout(() => {
      // refreshUser();
    // }, 1000);
  }

  async function registerNew(payload: any) {
    console.log(payload, 'payload in register')
    await fetch('/api/user/register', { headers: { 'Content-Type': 'application/json' }, method: 'POST', body: JSON.stringify(payload) })
    login(payload);
  }


  return (
    <UserContext.Provider
      value={
        {
          user,
          // takerFee: user.taker_fee, makerFee: user.maker_fee,
          userLoading, userError,
          refreshUser, logout, login, registerNew, deleteYourself,
          theme, btnColor
        }
      }>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
