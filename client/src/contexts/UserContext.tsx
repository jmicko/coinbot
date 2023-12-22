// UserContext.tsx
import { ReactNode } from 'react'
import useGetFetch from '../hooks/useGetFetch.js';
import useDeleteFetch from '../hooks/useDeleteFetch.js';
import { UserContext } from './useUser.js';
import { Credentials, User } from '../types/index.js';

// type User = {
//   theme: string;
//   taker_fee: number;
//   maker_fee: number;
//   // other properties...
// };


export function UserProvider({ children }: { children: ReactNode }) {
  console.log('UserProvider rendering ***************');

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
      defaultState: {} as User,
      preload: true,
      from: 'user in UserContext',
    }
  );

  const {
    isLoading: deleteLoading,
    error: deleteError,
    deleteData: deleteYourself
  } = useDeleteFetch({
    url: `/api/user/${user.id}`,
    from: 'deleteYourself in UserContext'
  });

  // infer theme from user object
  const theme = user ? user.theme : 'darkTheme';
  const btnColor = theme === 'darkTheme' ? 'btn-black' : 'btn-blue';

  // useEffect(() => {
  //   console.log(user, 'user in UserProvider, refreshing');
  //   // clear the user if there is a 403 error
  //   if (userError instanceof FetchError
  //     && userError.status === 403) {
  //     clearUser();
  //   }

  //   // refreshUser()
  // }, [userError])

  async function logout() {
    await fetch('/api/user/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    clearUser()
  }

  async function login(payload: Credentials) {
    console.log(
      userLoading,
      'userLoading before login',
      userError, 'userError before ...'
    );
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

  async function registerNew(payload: Credentials) {
    console.log(payload, 'payload in register')
    await fetch(
      '/api/user/register',
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(payload)
      })
    login(payload);
  }


  return (
    <UserContext.Provider
      value={
        {
          user,
          // takerFee: user?.taker_fee, 
          maker_fee: user?.maker_fee || 1,
          userLoading, userError, deleteLoading, deleteError,
          refreshUser, logout, login, registerNew, deleteYourself, clearUser,
          theme, btnColor
        }
      }>
      {children}
    </UserContext.Provider>
  )
}

