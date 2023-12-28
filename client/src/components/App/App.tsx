import './App.css'
// Directory imports
import { UserProvider } from '../../contexts/UserContext';
import CheckUser from '../CheckUser/CheckUser';
import { IdentifierProvider } from '../../contexts/IdentifierContext';

function App() {
  console.log('App rendering_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_2_');


  return (
    <IdentifierProvider>
      <UserProvider >
        <CheckUser />
      </UserProvider >
    </IdentifierProvider>
  );
}

export default App;