import './App.css'
// Directory imports
import { UserProvider, useUser } from '../../contexts/UserContext';
import Home from '../Home/Home';
import Login from '../Login/Login';
import { DataProvider } from '../../contexts/DataContext';
import { WebSocketProvider } from '../../contexts/WebSocketContext';

function App() {

  function CheckUser() {
    const { user, userLoading } = useUser();

    if (userLoading) {
      return <center>Loading...</center>;
    }
    if (user) {
      return (
        < DataProvider >
          < WebSocketProvider >
            <Home />
          </WebSocketProvider>
        </DataProvider>
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