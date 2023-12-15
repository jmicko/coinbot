import { useState } from 'react'
import './App.css'
// Directory imports
import { UserProvider, useUser } from '../../contexts/UserContext';
import Home from '../Home/Home';
import Login from '../Login/Login';

function App() {

  function CheckUser() {
    const { user, userLoading } = useUser();

    if (userLoading) {
      return <center>Loading...</center>;
    }
    if (user) {
      return (
        // < DataProvider >
        // < SocketProvider >
        <Home />
        //   </SocketProvider>
        // </DataProvider>
      )
    } else {
      return (
        <Login />
      )
    }
  }

  return (
    <div className={`App darkTheme`}>
      <UserProvider >
        <CheckUser />
      </UserProvider>
    </div >
  );
}

export default App;