import { useState } from 'react'
import './App.css'
// Directory imports
import { UserProvider, useUser } from '../../contexts/UserContext';
import Home from '../Home/Home';
import Login from '../Login/Login';

function App() {

  function CheckUser() {

    const { user } = useUser();
    return (
      <div className={`App darkTheme`}>
        {user.id
          ?
          // < DataProvider >
          // < SocketProvider >
          <Home />
          //   </SocketProvider>
          // </DataProvider>
          : <Login />
          // : <></>
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

export default App
