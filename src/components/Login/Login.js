import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Login.css'
// import mapStoreToProps from '../../redux/mapStoreToProps';



function Login(props) {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const dispatch = useDispatch();

  function loginAccount(event) {
    event.preventDefault();
    // send login credentials
    console.log('loging in user', username, password);
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
    dispatch({
      type: 'CLEAR_REGISTRATION_ERROR',
    });
    dispatch({
      type: 'CLEAR_LOGIN_ERROR',
    });
  }

  function registerAccount(event) {
    event.preventDefault();
    console.log('registering new user', username, password);
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
      // this.props.dispatch({ type: 'LOGIN_INPUT_ERROR' });
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
          // value={Number(price)}
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
      {/* </center> */}
      {/* {JSON.stringify(props.store.errorsReducer)} */}
      {props.store.errorsReducer.loginMessage && <p>{props.store.errorsReducer.loginMessage}</p>}
      {props.store.errorsReducer.registrationMessage && <p>{props.store.errorsReducer.registrationMessage}</p>}
    </div>
  );
}

export default connect(mapStoreToProps)(Login);
