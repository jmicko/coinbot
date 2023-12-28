import './App.css'
// Directory imports
import { UserProvider } from '../../contexts/UserContext';
import CheckUser from '../CheckUser/CheckUser';
import { TimestampProvider } from '../../contexts/TimestampContext';

function App() {
  console.log('App rendering_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_');


  return (
    <TimestampProvider>
      <UserProvider >
        <CheckUser />
      </UserProvider >
    </TimestampProvider>
  );
}

export default App;