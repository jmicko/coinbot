import React from 'react';
import './App.css';
// import './art.css';

// Directory imports
import Home from '../Home/Home.js';
import Login from '../Login/Login.js';
import { SocketProvider } from '../../contexts/SocketProvider.js';
import { DataProvider } from '../../contexts/DataContext.js';
import { UserProvider, useUser } from '../../contexts/UserContext.js';

function App() {
  // small component to check if user is logged in
  // if not, redirect to login page
  function CheckUser() {

    const { user } = useUser();
    // const { data } = useData();
    // console.log(user, 'user in checkuser');
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
