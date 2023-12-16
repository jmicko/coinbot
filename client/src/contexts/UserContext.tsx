// UserContext.tsx
import { createContext, useContext, useEffect, ReactNode } from 'react'
import useGetFetch from '../hooks/useGetFetch.js';
import useDeleteFetch from '../hooks/useDeleteFetch.js';

type User = {
  theme: string;
  taker_fee: number;
  maker_fee: number;
  // other properties...
};

const UserContext = createContext<any | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const {
    isLoading: deleteLoading,
    error: deleteError,
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
    {
      defaultState: null,
      preload: true
    }
  );

  // infer theme from user object
  const theme = user ? user.theme : 'darkTheme';
  const btnColor = theme === 'darkTheme' ? 'btn-black' : 'btn-blue';

  // useEffect(() => {
  //     refreshUser()
  // }, [])

  async function logout() {
    await fetch('/api/user/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
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
      console.log(userData, 'userData');
      setUser(userData);
    } else {
      console.log('Login failed');
    }
    console.log(user, response, 'logged in user, refreshing user');
    console.log(userLoading, 'userLoading', userError, 'userError');
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
          takerFee: user?.taker_fee, makerFee: user?.maker_fee,
          userLoading, userError, deleteLoading, deleteError,
          refreshUser, logout, login, registerNew, deleteYourself,
          theme, btnColor
        }
      }>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
