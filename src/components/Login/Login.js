import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Login.css'



function Login() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const dispatch = useDispatch();
  const errors = useSelector((store) => store.errorsReducer);

  function loginAccount(event) {
    event.preventDefault();
    // send login credentials
    // console.log('logging in user');
    if (username && password) {
      dispatch({
        type: 'LOGIN',
        payload: {
          username: username,
          password: password,
        },
      });
    } else {
      // this.props.dispatch({ type: 'LOGIN_INPUT_ERROR' });
      console.log('problem: put in your cred');
    }
  }

  function clearErrors() {
    dispatch({ type: 'CLEAR_REGISTRATION_ERROR', });
    dispatch({ type: 'CLEAR_LOGIN_ERROR', });
  }

  function registerAccount(event) {
    event.preventDefault();
    // console.log('registering new user');
    // send registration stuff
    if (username && password && confirmPassword && (password === confirmPassword)) {
      dispatch({
        type: 'REGISTER',
        payload: {
          username: username,
          password: password,
        },
      });
    } else {
      dispatch({ type: 'REGISTRATION_INPUT_ERROR' });
      console.log('problem: put in your cred');
    }
  }

  return (
    <div className="Login">
      {/* <center> */}

      {register
        ? <h2>Create New</h2>
        : <h2>Log In</h2>
      }
      <form className="login-form" onSubmit={register
        ? registerAccount
        : loginAccount
      }>
        <label htmlFor="username">
          Username:
        </label>
        <input
          type="text"
          name="username"
          required
          onChange={(event) => setUsername(event.target.value)}
        />

        <label htmlFor="password">
          Password:
        </label>
        <input
          type="password"
          name="password"
          required
          onChange={(event) => setPassword(event.target.value)}
        />

        {register
          ? <>
            <label htmlFor="confirmPassword">
              Confirm Password:
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <input className="btn-blue" type="submit" name="submit" value="Register" />
            <br></br>
            <button className="btn-blue" onClick={() => { setRegister(false); clearErrors() }}>
              Back to login
            </button>
          </>
          : <>
            <input className="btn-blue login-button" type="submit" name="submit" value="Log in" />
            <br></br>
            <button className="btn-blue" onClick={() => { setRegister(true); clearErrors() }}>
              Register New
            </button>
          </>
        }
      </form>
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
