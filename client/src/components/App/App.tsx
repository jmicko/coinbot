import './App.css'
// Directory imports
import { UserProvider } from '../../providers/UserProvider';
import CheckUser from '../CheckUser/CheckUser';
import { IdentifierProvider } from '../../providers/IdentifierProvider';

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