import './App.css'
// Directory imports
import { UserProvider } from '../../contexts/UserContext';
import Home from '../Home/Home';
import Login from '../Login/Login';
import { DataProvider } from '../../contexts/DataContext';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import { useUser } from '../../contexts/useUser';

function App() {

  function CheckUser() {
    const { user, userLoading, userError } = useUser();
    console.log(user, 'user in App');

    if (!user.id && userLoading && !userError) {
      return <center>Loading...</center>;
    } else if (user.id) {
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