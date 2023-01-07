import React, { useEffect } from 'react';
import './App.css';

// Directory imports
import Home from '../Home/Home';
import Login from '../Login/Login';
import { SocketProvider } from '../../contexts/SocketProvider';
import { DataProvider, useData } from '../../contexts/DataContext';

function App() {
  // small component to check if user is logged in
  // if not, redirect to login page
  function CheckUser() {
    const { user } = useData();
    return (

      <div className={`App darkTheme`}>
        {user.id
          ? < SocketProvider >
            <Home />
          </SocketProvider>
          : <Login />
        }
      </div >
    )
  }

  return (
    <DataProvider >
      <CheckUser />
    </DataProvider>

  );
}

export default App;
