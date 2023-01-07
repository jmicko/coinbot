import React, { useEffect } from 'react';
import './App.css';

// Directory imports
import Home from '../Home/Home';
import Login from '../Login/Login';
import { SocketProvider } from '../../contexts/SocketProvider';
import { DataProvider, useData } from '../../contexts/DataContext';
import { UserProvider, useUser } from '../../contexts/UserContext';

function App() {
  // small component to check if user is logged in
  // if not, redirect to login page
  function CheckUser() {

    const { user, refreshUser } = useUser();
    // const { data } = useData();
    console.log(user, 'user in checkuser');
    return (

      <div className={`App darkTheme`}>
        {user.id
          ?
          < DataProvider >
            < SocketProvider >
              <Home />
            </SocketProvider>
          </DataProvider>
          : <Login />
        }
      </div >
    )
  }

  return (
    <UserProvider >
      <CheckUser />
    </UserProvider>


    // <div className={`App darkTheme`}>
    //   < UserProvider >
    //     {user.id
    //       ? < DataProvider >
    //         < SocketProvider >
    //           <Home />
    //         </SocketProvider>
    //       </DataProvider>
    //       : <Login />
    //     }
    //   </UserProvider>
    // </div >
  );
}

export default App;
