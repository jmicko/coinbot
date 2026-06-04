// UserContext.tsx
import { ReactNode, useEffect, useMemo } from 'react'
import useGetFetch from '../hooks/useGetFetch.js';
import useDeleteFetch from '../hooks/useDeleteFetch.js';
import { User } from '../types/index.js';
import useLocalStorage from '../hooks/useLocalStorage.js';
import usePostFetch from '../hooks/usePostFetch.js';
import { UserContext } from '../contexts/UserContext.js';

export function UserProvider({ children }: { children: ReactNode }) {
  console.log('UserProvider rendering @@@@@@@@@@@@@@@@');
  // const [loggedIn, setLoggedIn] = useState(false);
  const [defaultTheme, setDefaultTheme] = useLocalStorage<string>('defaultTheme', 'darkTheme', { defaultUser: true });

  const userOptions = useMemo(() => ({
    url: '/api/user',
    defaultState: {} as User,
    preload: true,
    from: 'user state in UserContext',
  }), []);
  const {
    data: user,
    setData: setUser,
    isLoading: userLoading,
    error: userError,
    refresh: refreshUser,
    clear: clearUser,
  } = useGetFetch<User>(userOptions);

  useEffect(() => {
    if (user.theme) {
      console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^setting default theme to', user.theme);
      setDefaultTheme(user.theme);
    }
  }, [user.theme, setDefaultTheme]);

  // infer theme from user object
  const theme = user.theme ? user.theme : defaultTheme;
  const btnColor = theme === 'darkTheme' ? 'btn-black' : 'btn-blue';

  const logoutOptions = useMemo(() => ({
    url: '/api/user/logout',
    from: 'logout in UserContext',
    refreshCallback: clearUser,
  }), [clearUser]);
  const { postData: logout } = usePostFetch(logoutOptions);

  const deleteYourselfOptions = useMemo(() => ({
    url: `/api/user/${user.id}`,
    from: 'deleteYourself in UserContext',
    refreshCallback: clearUser,
  }), [user.id, clearUser]);
  const {
    isLoading: deleteLoading,
    error: deleteError,
    deleteData: deleteYourself
  } = useDeleteFetch(deleteYourselfOptions);

  const loginOptions = useMemo(() => ({
    url: '/api/user/login',
    from: 'login in UserContext',
    setData: setUser,
  }), [setUser]);
  const {
    postData: login,
    isLoading: loginLoading,
    error: loginError,
  } = usePostFetch<User>(loginOptions);

  const registerNewOptions = useMemo(() => ({
    url: '/api/user/register',
    from: 'registerNew in UserContext',
    setData: setUser,
  }), [setUser]);
  const {
    postData: registerNew,
    isLoading: registerLoading,
    error: registerError,
  } = usePostFetch<User>(registerNewOptions);


  return (
    <UserContext.Provider
      value={
        {
          user,
          userLoading, userError,
          loginLoading, loginError,
          registerLoading, registerError,
          deleteLoading, deleteError,
          refreshUser, logout, login, registerNew, deleteYourself,
          theme, defaultTheme, btnColor
        }
      }>
      {children}
    </UserContext.Provider>
  )
}
