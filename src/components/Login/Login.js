import React, { useState } from 'react';
import './Login.css'
// import mapStoreToProps from '../../redux/mapStoreToProps';



function Login(props) {

  const [register, setRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function loginAccount(event) {
    event.preventDefault();
    // calculate flipped price
    console.log('loging in user', username, password);

  }

  function registerAccount(event) {
    event.preventDefault();
console.log('registering new user', username, password);
  }

  return (
    <div className="Login">
      <center>

        <h2>Log In</h2>
        <form onSubmit={register
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
                onChange={(event) => setPassword(event.target.value)}
              />
              <input className="btn-blue" type="submit" name="submit" value="Register" />
              <br></br>
              <button className="btn-blue" onClick={() => { setRegister(false) }}>
                Back to login
              </button>
            </>
            : <>
              <input className="btn-blue" type="submit" name="submit" value="Log in" />
              <br></br>
              <button className="btn-blue" onClick={() => { setRegister(true) }}>
                Register New
              </button>
            </>
          }
        </form>
      </center>
    </div>
  );
}

export default Login;
