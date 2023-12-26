import './App.css'
// Directory imports
import { UserProvider } from '../../contexts/UserContext';
import Home from '../Home/Home';
import Login from '../Login/Login';
import { DataProvider } from '../../contexts/DataContext';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import { useUser } from '../../contexts/useUser';



function CheckUser() {
  // const CheckUser = useCallback(() => {
  const { loggedIn, userLoading, userError } = useUser();
  // console.log(user, 'user in App');

  if (!loggedIn && userLoading && !userError) {
    return <center>Loading...</center>;
  }
  if (loggedIn) {
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
// }, []);

function App() {
  console.log('App rendering______________________');


  return (
    <div className={`App darkTheme`}>
      <UserProvider >
        <CheckUser />
      </UserProvider>
    </div >
  );
}

export default App;