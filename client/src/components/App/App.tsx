import './App.css'
// Directory imports
import { UserProvider } from '../../contexts/UserContext';
// import Home from '../Home/Home';
// import Login from '../Login/Login';
// import { DataProvider } from '../../contexts/DataContext';
// import { WebSocketProvider } from '../../contexts/WebSocketContext';
// import { useUser } from '../../contexts/useUser';
// import { DotLoader } from '../Loading';
import CheckUser from '../CheckUser/CheckUser';
// import useLocalStorage from '../../hooks/useLocalStorage';



// function CheckUser() {
//   console.log('CheckUser rendering______________________');
//   // const CheckUser = useCallback(() => {
//   const { user, userLoading, userError, defaultTheme } = useUser();
//   // const [defaultTheme] = useLocalStorage<string>('defaultTheme', 'darkTheme', { defaultUser: true });
//   // console.log(user, 'user in App');

//   if (userLoading && !userError && !user.id) {
//     return (
//       <div className={`login-background ${defaultTheme}`}>
//         {/* <center>Loading...</center>; */}
//         <center>Loading<DotLoader /></center>
//       </div>
//     )
//   }

//   if (user.id && !userError) {
//     console.count('user.id, rendering Home');
//     return (
//       // {/* default theme = {defaultTheme}<br />
//       // logged in = {JSON.stringify(user)}<br />
//       // user loading = {JSON.stringify(userLoading)}<br />
//       // user error = {JSON.stringify(userError)}<br /> */}
//       < DataProvider >
//         < WebSocketProvider >
//           <div className={`App ${defaultTheme}`}>
//             <Home />
//           </div >
//         </WebSocketProvider>
//       </DataProvider >

//     )
//   }

//   return (
//     // <div className={`App ${defaultTheme}`}>
//     // default theme = {defaultTheme}<br />
//     // logged in = {JSON.stringify(user)}<br />
//     // user loading = {JSON.stringify(userLoading)}<br />
//     // user error = {JSON.stringify(userError)}<br />
//     <Login />
//     // </div>
//   )
// }
// }, []);

function App() {
  console.log('App rendering_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_');


  return (
    <UserProvider >
      {/* < DataProvider > */}
      <CheckUser />
      {/* </DataProvider> */}
    </UserProvider >
  );
}

export default App;