import './App.css';
import {
  HashRouter as Router,
  Route,
  // Redirect,
  // Switch,
} from 'react-router-dom';
import { connect } from 'react-redux';
import { SocketProvider } from "../../contexts/SocketProvider";

// Directory imports
import Trade from '../Trade/Trade';
import Home from '../Home/Home';

function App() {
  return (
    <div className="App">
      {/* <Nav /> */}
      <SocketProvider>
        <Router>
          <Route
            exact path="/"
            component={Home} />
        </Router>
      </SocketProvider>
    </div>
  );
}

export default connect()(App);
