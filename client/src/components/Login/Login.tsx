import React, { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useUser } from '../../contexts/UserContext.js';
// import { useFetchData } from '../../hooks/fetchData.js';
import './Login.css'
import useGetFetch from '../../hooks/useGetFetch.js';
// import useWindowDimensions from '../../hooks/useWindowDimensions.js';

const Login: React.FC = () => {
  const { login, registerNew, refreshUser } = useUser();

  // const { width, height } = useWindowDimensions();

  const [errors, setErrors] = useState({ loginMessage: '', registrationMessage: '' });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [register, setRegister] = useState<boolean>(false);
  const {
    refresh: refreshConnection,
    error: connectionError
  } = useGetFetch<{ connection: boolean }>(
    '/api/settings/connection',
    { defaultState: { connection: false } }
  );

  // check the connection every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('checking if connection is working')
      refreshConnection();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // set interval to refresh user every 10 seconds, then clear interval on unmount
    const interval = setInterval(() => {
      console.log('checking if user logged in')
      refreshUser();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loginAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // send login credentials
    // console.log('logging in user');
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
    <div className="Login">
      {register ? <h2>Create New</h2> : <h2>Log In</h2>}
      {/* <h3>{width} x {height}</h3> */}
      <form className="login-form" onSubmit={register ? registerAccount : loginAccount}>
        <label htmlFor="username">Username:</label>
        <input
          type="text"
          name="username"
          required
          onChange={handleInputChange}
          value={username}
        />

        <label htmlFor="password">
          Password:
        </label>
        <input
          type="password"
          name="password"
          required
          onChange={handleInputChange}
          value={password}
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
              className="btn-blue"
              name="submit"
              value="Register >"
            />
          </>
          : (<input
            className="btn-blue login-button"
            type="submit"
            name="submit"
            value="Log In >" />)}
        <button className="btn-blue" onClick={(e) => { e.preventDefault(); setRegister(!register); clearErrors(); }}>
          {register ? '< Back to Log In' : 'Register New'}
        </button>
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
  );
}

export default Login;
