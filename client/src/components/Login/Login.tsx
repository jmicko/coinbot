import React, { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useUser } from '../../contexts/UserContext.js';
import { useFetchData } from '../../hooks/fetchData.js';
import './Login.css'
import useWindowDimensions from '../../hooks/useWindowDimensions.js';

const Login: React.FC = () => {
  const { login, registerNew, refreshUser } = useUser();

  const {width, height} = useWindowDimensions();

  const [errors, setErrors] = useState({ loginMessage: '', registrationMessage: '' });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  // const errors = useSelector((store) => store.errorsReducer);

  // verify that the internet connection is working and that the server is running 
  // by calling /api/settings/connection, which returns a 200 status code
  // if the connection is not working, show an error message on the login page
  const { data: connection, isLoading: connectionLoading, error: connectionError, refresh: refreshConnection }
    = useFetchData('/api/settings/connection', { defaultState: { connection: false } });

  // if the connection is not working, refresh every 5 seconds
  useEffect(() => {
    // set interval to refresh connection every 5 seconds, then clear interval on unmount
    const interval = setInterval(() => {
      console.log('checking if connection is working')
      refreshConnection();
    }, 5000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    // set interval to refresh user every 5 seconds, then clear interval on unmount
    const interval = setInterval(() => {
      console.log('checking if user looged in')
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
    // console.log('registering new user');
    // send registration stuff
    if (username && password && confirmPassword && (password === confirmPassword)) {
      registerNew({ username, password });
    } else {
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
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  }


  return (
    <div className="Login">
      {register ? <h2>Create New</h2> : <h2>Log In</h2>}
      <h3>{width} x {height}</h3>
      <form className="login-form" onSubmit={register ? registerAccount : loginAccount}>
        <label htmlFor="username">Username:</label>
        <input type="text" name="username" required onChange={handleInputChange} />

        <label htmlFor="password">Password:</label>
        <input type="password" name="password" required onChange={handleInputChange} />

        {register ? (
        <>
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input type="password" name="confirmPassword" required onChange={handleInputChange} />
          <input className="btn-blue" type="submit" name="submit" value="Register" />
          <button className="btn-blue" onClick={() => { setRegister(false); clearErrors(); }}>
            Back to login
          </button>
        </>
      ) : (
        <>
          <input className="btn-blue login-button" type="submit" name="submit" value="Log in" />
          <button className="btn-blue" onClick={() => { setRegister(true); clearErrors(); }}>
            Register New
          </button>
        </>
      )}
      </form>
    </div>
  );
}

export default Login;
