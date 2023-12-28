import { DataProvider } from "../../contexts/DataContext";
import { WebSocketProvider } from "../../contexts/WebSocketContext";
import { useUser } from "../../contexts/useUser";
import Home from "../Home/Home";
import { SpaceLoader } from "../Loading";
import Login from "../Login/Login";

export default function CheckUser() {
  // console.log('CheckUser rendering______________________');
  const { user, userLoading, userError, defaultTheme } = useUser();

  console.count('user.id, rendering Home');
  return (
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
          <center>Loading<SpaceLoader /></center>
        </div>
        : <>
          {/* default theme = {defaultTheme}<br />
          logged in = {JSON.stringify(user)}<br />
          user loading = {JSON.stringify(userLoading)}<br />
          user error = {JSON.stringify(userError)}<br /> */}
          <Login />
        </>
  )
}