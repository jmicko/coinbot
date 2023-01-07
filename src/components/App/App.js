import React, { useEffect } from 'react';
import './App.css';
import { useDispatch, useSelector } from 'react-redux';

// Directory imports
import Home from '../Home/Home';
import Login from '../Login/Login';
import { SocketProvider } from '../../contexts/SocketProvider';
import { DataProvider } from '../../contexts/DataContext';

function App() {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);

  useEffect(() => {
    dispatch({ type: 'FETCH_USER' });
    return
  }, [dispatch])




  return (
    <DataProvider >
      <div className={`App darkTheme`}>
        {user.id
          ?
          < SocketProvider >
            <Home />
          </SocketProvider>
          : <Login />
        }
      </div >
    </DataProvider>
  );
}

export default App;
