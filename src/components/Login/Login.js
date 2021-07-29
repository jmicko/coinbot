import React, { useState } from 'react';
import './Login.css'
// import mapStoreToProps from '../../redux/mapStoreToProps';



function Login(props) {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="Login">
      <center>

      <h2>Log In</h2>
      <form>
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
          // value={Number(price)}
          required
          onChange={(event) => setPassword(event.target.value)}
          />
        <input className="btn-send-trade btn-blue" type="submit" name="submit" value="Log in" />
      </form>
          </center>
    </div>
  );
}

export default Login;
