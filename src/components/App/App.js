import React, { useEffect } from 'react';
import './App.css';
import { useDispatch, useSelector } from 'react-redux';

// Directory imports
import Home from '../Home/Home';
import Login from '../Login/Login';
import { SocketProvider } from '../../contexts/SocketProvider';
import { TickerProvider } from '../../contexts/TickerProvider';

function App() {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);

  useEffect(() => {
    dispatch({ type: 'FETCH_USER' });
    return
  }, [dispatch])




  return (
    <div className={`App darkTheme`}>
          <SocketProvider>
            <TickerProvider>
                  {user.id
                  ? <Home />
                  : <Login />}
            </TickerProvider>
          </SocketProvider>
    </div>
  );
}

export default App;
