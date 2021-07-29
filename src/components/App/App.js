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
import Home from '../Home/Home';
import Login from '../Login/Login';

function App() {
  return (
    <div className="App">
      {/* all components wrapped inside the socket provider will have access to the same socket */}
      <SocketProvider>
        <Router>
          <Route
            exact path="/"
            component={Home} />
          <Route
            exact path="/login"
            component={Login} />
        </Router>
      </SocketProvider>
    </div>
  );
}

export default connect()(App);
