import { DataProvider } from "../../contexts/DataContext";
import { WebSocketProvider } from "../../contexts/WebSocketContext";
import { useUser } from "../../contexts/useUser";
import Home from "../Home/Home";
import { DotLoader } from "../Loading";
import Login from "../Login/Login";

export default function CheckUser() {
  console.log('CheckUser rendering______________________');
  // const CheckUser = useCallback(() => {
  const { user, userLoading, userError, defaultTheme } = useUser();
  // const [defaultTheme] = useLocalStorage<string>('defaultTheme', 'darkTheme', { defaultUser: true });
  // console.log(user, 'user in App');

  // if (userLoading && !userError && !user.id) {
  //   return (
  //     <div className={`login-background ${defaultTheme}`}>
  //       {/* <center>Loading...</center>; */}
  //       <center>Loading<DotLoader /></center>
  //     </div>
  //   )
  // }

  // if (user.id && !userError) {
  console.count('user.id, rendering Home');
  return (
    // {/* default theme = {defaultTheme}<br />
    // logged in = {JSON.stringify(user)}<br />
    // user loading = {JSON.stringify(userLoading)}<br />
    // user error = {JSON.stringify(userError)}<br /> */}
    user.id && !userError
      ? < DataProvider >
        < WebSocketProvider >
          <div className={`App ${defaultTheme}`}>
            <Home />
          </div >
        </WebSocketProvider>
      </DataProvider >
      : userLoading && !userError && !user.id
        ?
        <div className={`login-background ${defaultTheme}`}>
          <center>Loading<DotLoader /></center>
        </div>
        : <>
          default theme = {defaultTheme}<br />
          logged in = {JSON.stringify(user)}<br />
          user loading = {JSON.stringify(userLoading)}<br />
          user error = {JSON.stringify(userError)}<br />
          <Login />
        </>

  )
  // }

  // return (
  //   // <div className={`App ${defaultTheme}`}>
  //   // default theme = {defaultTheme}<br />
  //   // logged in = {JSON.stringify(user)}<br />
  //   // user loading = {JSON.stringify(userLoading)}<br />
  //   // user error = {JSON.stringify(userError)}<br />
  //   <Login />
  //   // </div>
  // )
}