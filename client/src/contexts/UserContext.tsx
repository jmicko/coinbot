// UserContext.tsx
import { ReactNode, useCallback, useEffect, useState } from 'react'
import useGetFetch from '../hooks/useGetFetch.js';
import useDeleteFetch from '../hooks/useDeleteFetch.js';
import { UserContext } from './useUser.js';
import { Credentials, User } from '../types/index.js';

export function UserProvider({ children }: { children: ReactNode }) {
  console.log('UserProvider rendering @@@@@@@@@@@@@@@@');
  const [loggedIn, setLoggedIn] = useState(false);

  const {
    data: user,
    setData: setUser,
    isLoading: userLoading,
    error: userError,
    refresh: refreshUser,
    clear: clearUser,
  } = useGetFetch<User>(
    '/api/user',
    {
      defaultState: { id: 0 } as User,
      preload: true,
      from: 'user in UserContext',
    }
  );

  useEffect(() => {
    if (user.id) {
      setLoggedIn(true);
    } else {
      // setLoggedIn(false);
    }
  }, [user]);


  // infer theme from user object
  const theme = user ? user.theme : 'darkTheme';
  const btnColor = theme === 'darkTheme' ? 'btn-black' : 'btn-blue';

  const logout = useCallback(async () => {
    await fetch('/api/user/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    clearUser();
    setLoggedIn(false);
  }, [clearUser]);


  const {
    isLoading: deleteLoading,
    error: deleteError,
    deleteData: deleteYourself
  } = useDeleteFetch({
    url: `/api/user/${user.id}`,
    from: 'deleteYourself in UserContext',
    refreshCallback: logout,
  });


  const login = useCallback(async (payload: Credentials) => {
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
  }, [setUser]);

  const registerNew = useCallback(async (payload: Credentials) => {
    await fetch(
      '/api/user/register',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(payload)
      })
    login(payload);
  }, [login]);


  return (
    <UserContext.Provider
      value={
        {
          user, loggedIn,
          // takerFee: user?.taker_fee, 
          // maker_fee: user.maker_fee,
          userLoading, userError, deleteLoading, deleteError,
          refreshUser, logout, login, registerNew, deleteYourself,
          theme, btnColor
        }
      }>
      {children}
    </UserContext.Provider>
  )
}

