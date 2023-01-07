import React, { useEffect } from 'react';
import './App.css';
import { useDispatch, useSelector } from 'react-redux';

// Directory imports
import Home from '../Home/Home';
import Login from '../Login/Login';
import { SocketProvider } from '../../contexts/SocketProvider';
import { DataProvider, useData } from '../../contexts/DataContext';

function App() {
  const dispatch = useDispatch();
  // const user = useSelector((store) => store.accountReducer.userReducer);

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


  useEffect(() => {
    dispatch({ type: 'FETCH_USER' });
    return
  }, [dispatch])




  return (
    <DataProvider >
      <CheckUser />
    </DataProvider>


    // <DataProvider >
    //   <div className={`App darkTheme`}>
    //     {user.id
    //       ?
    //       < SocketProvider >
    //         <Home />
    //       </SocketProvider>
    //       : <Login />
    //     }
    //   </div >
    // </DataProvider>
  );
}

export default App;
