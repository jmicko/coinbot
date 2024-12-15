import React, { useEffect, useState, FormEvent, ChangeEvent, useMemo } from 'react';
import { useUser } from '../../hooks/useUser.js';
// import { useFetchData } from '../../hooks/fetchData.js';
import './Login.css'
import useGetFetch from '../../hooks/useGetFetch.js';
// import useWindowDimensions from '../../hooks/useWindowDimensions.js';

const Login: React.FC = () => {
  const { login, registerNew, refreshUser, defaultTheme } = useUser();

  // const { width, height } = useWindowDimensions();

  const [errors, setErrors] = useState({ loginMessage: '', registrationMessage: '' });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [register, setRegister] = useState<boolean>(false);

  const connectionOptions = useMemo(() => ({
    url: '/api/settings/connection',
    defaultState: { connection: false, loggedIn: false },
    preload: false,
    from: 'connection in Login'
  }), []);
  const {
    data: connection,
    refresh: refreshConnection,
    error: connectionError
  } = useGetFetch<{ connection: boolean, loggedIn: boolean }>(connectionOptions);

  const loggedIn = connection.loggedIn;

  // check if registration is open
  const registrationOptions = useMemo(() => ({
    url: '/api/settings/registration',
    defaultState: { registrationOpen: false },
    preload: true,
    from: 'registration in Login'
  }), []);
  const {
    data: { registrationOpen },
    // refresh: refreshRegistration,
    error: registrationError
  } = useGetFetch<{ registrationOpen: boolean }>(registrationOptions);

  console.log('registrationOpen', registrationOpen);

  // check the connection every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('checking if connection is working')
      refreshConnection();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshConnection]);

  // check if user is logged in
  useEffect(() => {
    if (loggedIn) {
      refreshUser();
    }
  }, [loggedIn, refreshUser]);

  // useEffect(() => {
  //   // set interval to refresh user every 10 seconds, then clear interval on unmount
  //   const interval = setInterval(() => {
  //     console.log('checking if user logged in')
  //     refreshUser();
  //   }, 10000);
  //   return () => clearInterval(interval);
  // }, [refreshUser]);

  const loginAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // send login credentials
    console.log(username, password, 'logging in user');
    if (username && password) {
      login({ username, password });
    } else {
      // this.props.dispatch({ type: 'LOGIN_INPUT_ERROR' });
      console.log('problem: put in your cred');
    }
  }

  const registerAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // send registration stuff
    if (username && password && confirmPassword && (password === confirmPassword)) {
      registerNew({ username, password });
    } else {
      console.log('registering new user');
      if (password !== confirmPassword) {
        setErrors({ ...errors, registrationMessage: 'Passwords do not match' });
      } else if (!username || !password || !confirmPassword) {
        setErrors({ ...errors, registrationMessage: 'Please fill out all fields' });
      } else {
        setErrors({ ...errors, registrationMessage: 'Something went wrong' });
      }
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === 'username') setUsername(value);
    else if (name === 'password') setPassword(value);
    else if (name === 'confirmPassword') setConfirmPassword(value);
  }

  const clearErrors = () => {
    // setUsername("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className={`login-background ${defaultTheme}`}>
      <div className="Login">
        {register ? <h2>Create New</h2> : <h2>Log In</h2>}
        {/* <h3>{width} x {height}</h3> */}
        <form className="login-form" onSubmit={register ? registerAccount : loginAccount}>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            name="username"
            id='username'
            required
            onChange={handleInputChange}
            value={username}
            autoComplete='username'
          />

          <label htmlFor="password">
            Password:
          </label>
          <input
            type="password"
            name="password"
            id='password'
            required
            onChange={handleInputChange}
            value={password}
            autoComplete='current-password'
          />

          {register ?
            <>
              <label htmlFor="confirmPassword">
                Confirm Password:
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                onChange={handleInputChange}
                value={confirmPassword}
              />
              <input
                type="submit"
                className="btn-blue register-button"
                name="submit"
                value="Register >"
              />
            </>
            : (<input
              className="btn-blue login-button"
              type="submit"
              name="submit"
              value="Log In >" />)
          }
          <button className={`btn-blue ${!registrationOpen && 'hidden'}`} onClick={(e) => { e.preventDefault(); setRegister(!register); clearErrors(); }}>
            {register ? '< Back to Log In' : 'Register New'}
          </button>
          <br />
          {registrationOpen
            ? <p> This project is open source. You can host your own instance if you have a little technical know-how. </p>
            : <p>
              We are not currently accepting new users. This project is open source, so you can host your own instance if you have a little technical know-how.
            </p>}
          <a href="https://github.com/jmicko/coinbot" target="_blank" rel="noreferrer">
            View the project on github
          </a>
        </form>

        {connectionError && <div className='error-box notched'>
          <p>Connection Error</p>
        </div>}
        {(errors.loginMessage || errors.registrationMessage) &&
          <div className='error-box notched'>
            {errors.loginMessage && <p>{errors.loginMessage}</p>}
            {errors.registrationMessage && <p>{errors.registrationMessage}</p>}
          </div>
        }
      </div>
    </div>
  );
}

export default Login;
